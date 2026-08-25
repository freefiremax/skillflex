import type { FastifyInstance } from 'fastify'
import { prisma, readObjectList, readRecord } from '@skillswitch/db'
import {
  createTrackSchema,
  createAssignmentSchema,
  type Language,
  type RubricCriterion,
} from '@skillswitch/shared'
import { currentStudentId, notFound, requireAuth, requireRole } from '../../lib/auth.js'
import { mediaProvider } from '../../lib/media.js'

/**
 * Curriculum read + authoring.
 *
 * Reads are language-aware: the client passes ?language=hi and gets the Hindi
 * asset for each lesson. Language is a first-class column on LessonAsset, not a
 * subtitle track, so "multilingual" survives contact with the data model.
 */
export async function curriculumRoutes(app: FastifyInstance) {
  /** Published tracks with their module/lesson tree. */
  app.get('/tracks', { preHandler: requireAuth }, async (request) => {
    const { language } = (request.query ?? {}) as { language?: Language }

    const tracks = await prisma.track.findMany({
      where: { isPublished: true },
      orderBy: { order: 'asc' },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: { assets: { include: { media: true } }, assignments: true },
            },
          },
        },
      },
    })

    return {
      tracks: tracks.map((t) => ({
        id: t.id,
        slug: t.slug,
        title: t.title,
        description: t.description,
        modules: t.modules.map((m) => ({
          id: m.id,
          title: m.title,
          summary: m.summary,
          lessons: m.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            summary: l.summary,
            durationSeconds: l.durationSeconds,
            /** Which languages this lesson actually exists in. */
            availableLanguages: l.assets.map((a) => a.language as Language),
            assignmentCount: l.assignments.length,
            playbackUrl: pickAsset(l.assets, language),
          })),
        })),
      })),
    }
  })

  /** One lesson, resolved to a single language. */
  app.get('/lessons/:id', { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string }
    const { language } = (request.query ?? {}) as { language?: Language }

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        module: { include: { track: true } },
        assets: { include: { media: true } },
        assignments: { where: { isPublished: true } },
      },
    })
    if (!lesson) throw notFound('Lesson not found')

    return {
      id: lesson.id,
      title: lesson.title,
      summary: lesson.summary,
      durationSeconds: lesson.durationSeconds,
      track: { id: lesson.module.track.id, title: lesson.module.track.title },
      module: { id: lesson.module.id, title: lesson.module.title },
      availableLanguages: lesson.assets.map((a) => a.language as Language),
      playbackUrl: pickAsset(lesson.assets, language),
      assignments: lesson.assignments.map((a) => ({
        id: a.id,
        title: a.title,
        brief: a.brief,
        maxDurationSeconds: a.maxDurationSeconds,
        rubric: readObjectList<RubricCriterion>(a.rubric),
      })),
    }
  })

  /** A single assignment, plus this student's submission if any. */
  app.get('/assignments/:id', { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string }
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: { lesson: true },
    })
    if (!assignment) throw notFound('Assignment not found')

    let mine = null
    if (request.auth?.studentId) {
      const submission = await prisma.submission.findUnique({
        where: {
          assignmentId_studentId: {
            assignmentId: id,
            studentId: request.auth.studentId,
          },
        },
        include: { media: true, feedback: true },
      })
      if (submission) {
        mine = {
          id: submission.id,
          status: submission.status,
          submittedAt: submission.submittedAt,
          playbackUrl: submission.media?.playbackUrl ?? null,
          hasFeedback: Boolean(submission.feedback),
        }
      }
    }

    return {
      id: assignment.id,
      title: assignment.title,
      brief: assignment.brief,
      maxDurationSeconds: assignment.maxDurationSeconds,
      rubric: readObjectList<RubricCriterion>(assignment.rubric),
      lesson: { id: assignment.lesson.id, title: assignment.lesson.title },
      mySubmission: mine,
    }
  })

  /**
   * The student's week: every published assignment with its submission state.
   * This is what the dashboard renders — one query, no N+1 from the client.
   */
  app.get('/my-week', { preHandler: requireRole('student') }, async (request) => {
    const studentId = currentStudentId(request)

    const assignments = await prisma.assignment.findMany({
      where: { isPublished: true },
      include: {
        lesson: { include: { module: { include: { track: true } } } },
        submissions: {
          where: { studentId },
          include: { feedback: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return {
      assignments: assignments.map((a) => {
        const sub = a.submissions[0]
        return {
          id: a.id,
          title: a.title,
          brief: a.brief,
          maxDurationSeconds: a.maxDurationSeconds,
          lesson: { id: a.lesson.id, title: a.lesson.title },
          track: a.lesson.module.track.title,
          status: sub?.status ?? 'not_started',
          submissionId: sub?.id ?? null,
          hasFeedback: Boolean(sub?.feedback),
          rubricScores: sub?.feedback ? readRecord(sub.feedback.rubricScores) : null,
        }
      }),
    }
  })

  // -------------------------------------------------------------------------
  // Authoring (platform_admin). Deliberately thin — content ops in v1 is a
  // seed script plus these endpoints, not a full CMS.
  // -------------------------------------------------------------------------

  app.post('/tracks', { preHandler: requireRole('platform_admin') }, async (request, reply) => {
    const body = createTrackSchema.parse(request.body)
    const track = await prisma.track.create({ data: body })
    return reply.code(201).send({ id: track.id, slug: track.slug })
  })

  app.post('/assignments', { preHandler: requireRole('platform_admin') }, async (request, reply) => {
    const body = createAssignmentSchema.parse(request.body)
    const lesson = await prisma.lesson.findUnique({ where: { id: body.lessonId } })
    if (!lesson) throw notFound('Lesson not found')

    const assignment = await prisma.assignment.create({
      data: {
        lessonId: body.lessonId,
        title: body.title,
        brief: body.brief,
        rubric: body.rubric,
        maxDurationSeconds: body.maxDurationSeconds,
      },
    })
    return reply.code(201).send({ id: assignment.id })
  })
}

/**
 * Resolve a lesson to one playable URL for the requested language, falling back
 * through hi -> en rather than returning nothing. A student who picked Hindi
 * and hits an English-only lesson should still be able to watch it.
 */
function pickAsset(
  assets: Array<{ language: string; media: { playbackUrl: string | null; externalId: string | null } | null }>,
  language?: Language,
): string | null {
  const order = [language, 'hi', 'en'].filter(Boolean) as string[]
  for (const lang of order) {
    const hit = assets.find((a) => a.language === lang && a.media)
    if (hit?.media) {
      return hit.media.playbackUrl ?? (hit.media.externalId ? mediaProvider.playbackUrlFor(hit.media.externalId) : null)
    }
  }
  return null
}
