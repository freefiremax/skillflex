import type { FastifyInstance } from 'fastify'
import { prisma, readObjectList, readRecord } from '@skillflex/db'
import { createFeedbackSchema, type RubricCriterion } from '@skillflex/shared'
import {
  badRequest,
  conflict,
  currentMentorId,
  currentStudentId,
  currentUser,
  forbidden,
  notFound,
  requireRole,
} from '../../lib/auth.js'
import { currentMentorFor } from '../mentorship/service.js'

/**
 * Human feedback. This is the trust-critical artifact of the whole product —
 * no AI writes into this table, ever. The weekly plan (see plans module) may
 * only restructure what a mentor already wrote here.
 */
export async function feedbackRoutes(app: FastifyInstance) {
  /** Mentor submits feedback on one submission. */
  app.post('/', { preHandler: requireRole('mentor') }, async (request, reply) => {
    const mentorId = currentMentorId(request)
    const body = createFeedbackSchema.parse(request.body)

    const submission = await prisma.submission.findUnique({
      where: { id: body.submissionId },
      include: { assignment: true, feedback: true },
    })
    if (!submission) throw notFound('Submission not found')
    if (submission.feedback) {
      throw conflict('This submission already has feedback', 'FEEDBACK_EXISTS')
    }

    // Only the student's CURRENT mentor can review. A mentor who was switched
    // away from keeps their past feedback but loses write access.
    const active = await currentMentorFor(submission.studentId)
    if (active?.mentorId !== mentorId) {
      throw forbidden('This student is not currently assigned to you')
    }

    // Scores must line up with the assignment's rubric — otherwise the
    // accreditation dashboard aggregates keys that mean nothing.
    const rubric = readObjectList<RubricCriterion>(submission.assignment.rubric)
    const validKeys = new Set(rubric.map((c) => c.key))
    for (const [key, value] of Object.entries(body.rubricScores)) {
      const criterion = rubric.find((c) => c.key === key)
      if (!validKeys.has(key) || !criterion) {
        throw badRequest(`Unknown rubric key "${key}"`, 'BAD_RUBRIC_KEY')
      }
      if (value > criterion.max) {
        throw badRequest(`"${key}" is out of ${criterion.max}, got ${value}`, 'SCORE_OUT_OF_RANGE')
      }
    }

    const feedback = await prisma.$transaction(async (tx) => {
      const created = await tx.feedback.create({
        data: {
          submissionId: body.submissionId,
          mentorId,
          rubricScores: body.rubricScores,
          freeform: body.freeform,
          strengths: body.strengths ?? null,
          nextStep: body.nextStep ?? null,
        },
      })
      await tx.submission.update({
        where: { id: body.submissionId },
        data: { status: 'reviewed' },
      })
      return created
    })

    return reply.code(201).send({ id: feedback.id, submissionId: feedback.submissionId })
  })

  /**
   * The student's feedback history — including feedback from mentors they have
   * since left. Switching mentors must never cost a student their history.
   */
  app.get('/mine', { preHandler: requireRole('student') }, async (request) => {
    const studentId = currentStudentId(request)

    const feedback = await prisma.feedback.findMany({
      where: { submission: { studentId } },
      include: {
        mentor: { include: { user: true } },
        // `lesson` is new here: the feedback card links back to the video it was
        // written about, so the three screens form a loop instead of three
        // separate lists.
        submission: { include: { assignment: { include: { lesson: true } }, media: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      feedback: feedback.map((f) => ({
        id: f.id,
        at: f.createdAt,
        mentor: f.mentor.user.name,
        assignment: f.submission.assignment.title,
        assignmentId: f.submission.assignmentId,
        lesson: {
          id: f.submission.assignment.lesson.id,
          title: f.submission.assignment.lesson.title,
        },
        submissionId: f.submissionId,
        playbackUrl: f.submission.media?.playbackUrl ?? null,
        rubric: readObjectList<RubricCriterion>(f.submission.assignment.rubric),
        rubricScores: readRecord(f.rubricScores),
        freeform: f.freeform,
        strengths: f.strengths,
        nextStep: f.nextStep,
      })),
    }
  })

  /** One feedback item. Visible to its author and to the student it's about. */
  app.get('/:id', { preHandler: requireRole('student', 'mentor') }, async (request) => {
    const { id } = request.params as { id: string }
    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: {
        mentor: { include: { user: true } },
        submission: { include: { assignment: true, media: true } },
      },
    })
    if (!feedback) throw notFound('Feedback not found')

    const auth = currentUser(request)
    const isAuthor = auth.mentorId === feedback.mentorId
    const isSubject = auth.studentId === feedback.submission.studentId
    if (!isAuthor && !isSubject) throw forbidden('Not yours to read')

    return {
      id: feedback.id,
      at: feedback.createdAt,
      mentor: feedback.mentor.user.name,
      assignment: feedback.submission.assignment.title,
      playbackUrl: feedback.submission.media?.playbackUrl ?? null,
      rubric: readObjectList<RubricCriterion>(feedback.submission.assignment.rubric),
      rubricScores: readRecord(feedback.rubricScores),
      freeform: feedback.freeform,
      strengths: feedback.strengths,
      nextStep: feedback.nextStep,
    }
  })
}
