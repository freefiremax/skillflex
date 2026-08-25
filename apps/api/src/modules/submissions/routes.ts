import type { FastifyInstance } from 'fastify'
import { prisma, readObjectList } from '@skillswitch/db'
import { createSubmissionSchema, type RubricCriterion } from '@skillswitch/shared'
import { badRequest, currentMentorId, currentStudentId, currentUser, forbidden, notFound, requireRole } from '../../lib/auth.js'
import { currentMentorFor } from '../mentorship/service.js'

/**
 * Submissions: the student records a video against an assignment and submits it.
 * A submission is unique per (assignment, student) — resubmitting reopens the
 * same row rather than piling up drafts, which keeps the mentor's queue sane.
 */
export async function submissionRoutes(app: FastifyInstance) {
  /**
   * Create or update this student's submission for an assignment, then mark it
   * submitted. The media must be uploaded (status ready) and owned by the
   * student before it can be attached.
   */
  app.post('/', { preHandler: requireRole('student') }, async (request, reply) => {
    const studentId = currentStudentId(request)
    const body = createSubmissionSchema.parse(request.body)

    const assignment = await prisma.assignment.findUnique({ where: { id: body.assignmentId } })
    if (!assignment) throw notFound('Assignment not found')

    const media = await prisma.mediaAsset.findUnique({ where: { id: body.mediaId } })
    if (!media || media.deletedAt) throw notFound('Media not found')
    if (media.ownerUserId !== currentUser(request).sub) throw forbidden('Not your recording')
    if (media.status !== 'ready') {
      throw badRequest('Your video is still processing — try again in a moment', 'MEDIA_NOT_READY')
    }

    const submission = await prisma.submission.upsert({
      where: {
        assignmentId_studentId: { assignmentId: body.assignmentId, studentId },
      },
      create: {
        assignmentId: body.assignmentId,
        studentId,
        mediaId: body.mediaId,
        note: body.note ?? null,
        status: 'submitted',
        submittedAt: new Date(),
      },
      update: {
        mediaId: body.mediaId,
        note: body.note ?? null,
        status: 'submitted',
        submittedAt: new Date(),
      },
    })

    return reply.code(201).send({
      id: submission.id,
      status: submission.status,
      submittedAt: submission.submittedAt,
    })
  })

  /** The student's own submissions, newest first. */
  app.get('/mine', { preHandler: requireRole('student') }, async (request) => {
    const studentId = currentStudentId(request)
    const submissions = await prisma.submission.findMany({
      where: { studentId },
      include: {
        assignment: { include: { lesson: true } },
        media: true,
        feedback: true,
      },
      orderBy: { updatedAt: 'desc' },
    })

    return {
      submissions: submissions.map((s) => ({
        id: s.id,
        status: s.status,
        submittedAt: s.submittedAt,
        assignment: { id: s.assignment.id, title: s.assignment.title },
        lesson: s.assignment.lesson.title,
        playbackUrl: s.media?.playbackUrl ?? null,
        hasFeedback: Boolean(s.feedback),
      })),
    }
  })

  /**
   * The mentor's review queue: submitted work from THEIR active students that
   * hasn't been reviewed yet. This is the mentor console's home screen.
   */
  app.get('/queue', { preHandler: requireRole('mentor') }, async (request) => {
    const mentorId = currentMentorId(request)

    const activeStudents = await prisma.mentorAssignment.findMany({
      where: { mentorId, endedAt: null },
      select: { studentId: true },
    })
    const studentIds = activeStudents.map((a) => a.studentId)

    const submissions = await prisma.submission.findMany({
      where: {
        studentId: { in: studentIds },
        status: { in: ['submitted', 'in_review'] },
        feedback: null,
      },
      include: {
        assignment: true,
        student: { include: { user: true } },
        media: true,
      },
      orderBy: { submittedAt: 'asc' },
    })

    return {
      queue: submissions.map((s) => ({
        submissionId: s.id,
        status: s.status,
        submittedAt: s.submittedAt,
        student: s.student.user.name,
        assignment: s.assignment.title,
        playbackUrl: s.media?.playbackUrl ?? null,
      })),
    }
  })

  /**
   * One submission for review. A mentor may only open a submission from one of
   * their own active students; a student may only open their own.
   */
  app.get('/:id', { preHandler: requireRole('student', 'mentor') }, async (request) => {
    const { id } = request.params as { id: string }
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        assignment: { include: { lesson: true } },
        student: { include: { user: true } },
        media: true,
        feedback: true,
      },
    })
    if (!submission) throw notFound('Submission not found')

    const auth = currentUser(request)
    if (auth.role === 'student') {
      if (submission.studentId !== auth.studentId) throw forbidden('Not your submission')
    } else {
      const current = await currentMentorFor(submission.studentId)
      if (current?.mentorId !== auth.mentorId) {
        throw forbidden('This student is not currently assigned to you')
      }
      // Opening it moves it into review so the queue reflects reality.
      if (submission.status === 'submitted') {
        await prisma.submission.update({ where: { id }, data: { status: 'in_review' } })
      }
    }

    return {
      id: submission.id,
      status: submission.status,
      note: submission.note,
      submittedAt: submission.submittedAt,
      student: submission.student.user.name,
      assignment: {
        id: submission.assignment.id,
        title: submission.assignment.title,
        brief: submission.assignment.brief,
        rubric: readObjectList<RubricCriterion>(submission.assignment.rubric),
      },
      lesson: submission.assignment.lesson.title,
      playbackUrl: submission.media?.playbackUrl ?? null,
      feedback: submission.feedback
        ? {
            id: submission.feedback.id,
            freeform: submission.feedback.freeform,
            strengths: submission.feedback.strengths,
            nextStep: submission.feedback.nextStep,
          }
        : null,
    }
  })
}
