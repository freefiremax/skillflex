import type { FastifyInstance } from 'fastify'
import { prisma, readList } from '@skillflex/db'
import {
  mentorSearchSchema,
  switchMentorSchema,
  updateMentorProfileSchema,
  SWITCH_REASON_LABELS,
  type Language,
} from '@skillflex/shared'
import {
  currentMentorId,
  currentStudentId,
  notFound,
  requireRole,
} from '../../lib/auth.js'
import { currentMentorFor, searchMentors, switchMentor } from './service.js'
import { mentorHealthFor, mentorHealthReport } from './health.js'

export async function mentorshipRoutes(app: FastifyInstance) {
  /** The student's current mentor. */
  app.get('/me', { preHandler: requireRole('student') }, async (request) => {
    const studentId = currentStudentId(request)
    const assignment = await currentMentorFor(studentId)
    if (!assignment) return { mentor: null, since: null }

    return {
      since: assignment.startedAt,
      mentor: {
        id: assignment.mentor.id,
        name: assignment.mentor.user.name,
        headline: assignment.mentor.headline,
        bio: assignment.mentor.bio,
        languages: readList(assignment.mentor.languages) as Language[],
        skills: readList(assignment.mentor.skills),
      },
    }
  })

  /** Browsable cross-college mentor pool. */
  app.get('/mentors', { preHandler: requireRole('student') }, async (request) => {
    const filter = mentorSearchSchema.parse(request.query ?? {})
    const mentors = await searchMentors(filter)
    return { mentors }
  })

  /** The switch itself — a few clicks, no new subscription. */
  app.post('/switch', { preHandler: requireRole('student') }, async (request) => {
    const studentId = currentStudentId(request)
    const body = switchMentorSchema.parse(request.body)
    const assignment = await switchMentor({ studentId, ...body })

    return {
      ok: true,
      mentor: assignment
        ? {
            id: assignment.mentor.id,
            name: assignment.mentor.user.name,
            headline: assignment.mentor.headline,
          }
        : null,
    }
  })

  /** Switch history — visible to the student, and the seed of the data moat. */
  app.get('/history', { preHandler: requireRole('student') }, async (request) => {
    const studentId = currentStudentId(request)
    const events = await prisma.mentorSwitchEvent.findMany({
      where: { studentId },
      include: {
        fromMentor: { include: { user: true } },
        toMentor: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      events: events.map((e) => ({
        id: e.id,
        at: e.createdAt,
        from: e.fromMentor?.user.name ?? null,
        to: e.toMentor.user.name,
        reasonCode: e.reasonCode,
        reasonLabel:
          SWITCH_REASON_LABELS[e.reasonCode as keyof typeof SWITCH_REASON_LABELS] ?? e.reasonCode,
        note: e.note,
      })),
    }
  })

  /** Mentor edits their own profile (languages + skills drive matching). */
  app.patch('/profile', { preHandler: requireRole('mentor') }, async (request) => {
    const mentorId = currentMentorId(request)
    const body = updateMentorProfileSchema.parse(request.body)

    const updated = await prisma.mentorProfile.update({
      where: { id: mentorId },
      data: {
        ...(body.headline !== undefined ? { headline: body.headline } : {}),
        ...(body.bio !== undefined ? { bio: body.bio } : {}),
        ...(body.languages ? { languages: body.languages } : {}),
        ...(body.skills ? { skills: body.skills } : {}),
        ...(body.maxActiveStudents !== undefined
          ? { maxActiveStudents: body.maxActiveStudents }
          : {}),
        ...(body.isAcceptingStudents !== undefined
          ? { isAcceptingStudents: body.isAcceptingStudents }
          : {}),
      },
    })

    return { ok: true, id: updated.id }
  })

  /** Mentor's roster of active students. */
  app.get('/students', { preHandler: requireRole('mentor') }, async (request) => {
    const mentorId = currentMentorId(request)
    const assignments = await prisma.mentorAssignment.findMany({
      where: { mentorId, endedAt: null },
      include: { student: { include: { user: true, cohort: true } } },
      orderBy: { startedAt: 'desc' },
    })

    return {
      students: assignments.map((a) => ({
        studentId: a.student.id,
        name: a.student.user.name,
        cohort: a.student.cohort?.name ?? null,
        languages: readList(a.student.preferredLanguages) as Language[],
        since: a.startedAt,
      })),
    }
  })

  /**
   * Platform-admin view: every mentor's load, worst-first. Detection only —
   * this endpoint recommends, it never reassigns or pauses anyone.
   */
  app.get('/health', { preHandler: requireRole('platform_admin') }, async () => {
    const mentors = await mentorHealthReport()
    return {
      mentors,
      note: 'Load estimates from operational signals only (assignments, review backlog, turnaround). No AI judgement of mentor quality, and no change is made automatically — these are prompts for a human decision.',
    }
  })

  /**
   * A mentor's own health. Shown back to the mentor as a self-check, not a
   * ranking against peers — so it returns only their own numbers.
   */
  app.get('/health/me', { preHandler: requireRole('mentor') }, async (request) => {
    const mentorId = currentMentorId(request)
    return mentorHealthFor(mentorId)
  })

  /** A single mentor's public profile. */
  app.get('/mentors/:id', { preHandler: requireRole('student') }, async (request) => {
    const { id } = request.params as { id: string }
    const mentor = await prisma.mentorProfile.findUnique({
      where: { id },
      include: { user: true },
    })
    if (!mentor) throw notFound('Mentor not found')

    return {
      id: mentor.id,
      name: mentor.user.name,
      headline: mentor.headline,
      bio: mentor.bio,
      languages: readList(mentor.languages) as Language[],
      skills: readList(mentor.skills),
    }
  })
}
