import type { FastifyInstance } from 'fastify'
import { prisma } from '@skillflex/db'
import {
  createLiveClassSchema,
  liveClassSearchSchema,
  publishRecordingSchema,
  recordingProgressSchema,
  updateLiveClassSchema,
  effectiveLiveClassStatus,
} from '@skillflex/shared'
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
import {
  joinability,
  orgIdsForUser,
  ownedClass,
  register,
  saveProgress,
  serializeClass,
  serializeForMentor,
  visibilityFilter,
} from './service.js'

/** Everything a student-facing serializer needs in one place. */
const studentInclude = {
  mentor: { include: { user: true } },
  recordingMedia: true,
  _count: { select: { registrations: true } },
} as const

/**
 * Live lectures + the on-demand library they leave behind.
 *
 * The two halves are one module rather than two because they are one object at
 * different points in its life: a recording IS an ended lecture that has a media
 * asset attached. Splitting them would mean two tables and a sync problem.
 */
export async function liveRoutes(app: FastifyInstance) {
  // -------------------------------------------------------------------------
  // Student: browse + register + join
  // -------------------------------------------------------------------------

  /**
   * Upcoming and in-progress lectures the student can see.
   *
   * `ended` classes are filtered in JS rather than SQL because "ended" is partly
   * derived from the clock (see effectiveLiveClassStatus) — a class still stored
   * as `live` two days later is over, and no WHERE clause on `status` knows that.
   */
  app.get('/classes', { preHandler: requireRole('student') }, async (request) => {
    const user = currentUser(request)
    const studentId = currentStudentId(request)
    const filter = liveClassSearchSchema.parse(request.query ?? {})
    const orgIds = await orgIdsForUser(user.sub)

    const classes = await prisma.liveClass.findMany({
      where: {
        status: { in: ['scheduled', 'live'] },
        ...visibilityFilter(orgIds),
        ...(filter.language ? { language: filter.language } : {}),
        ...(filter.skill ? { skill: filter.skill } : {}),
      },
      include: studentInclude,
      orderBy: { scheduledAt: 'asc' },
    })

    const mine = await prisma.liveClassRegistration.findMany({
      where: { studentId, classId: { in: classes.map((c) => c.id) } },
    })
    const byClass = new Map(mine.map((r) => [r.classId, r]))

    const q = filter.q?.toLowerCase()
    return {
      classes: classes
        .filter((c) => effectiveLiveClassStatus(c) !== 'ended')
        .filter((c) => {
          if (!q) return true
          return `${c.title} ${c.description ?? ''} ${c.mentor.user.name}`.toLowerCase().includes(q)
        })
        .map((c) => serializeClass(c, byClass.get(c.id))),
    }
  })

  /**
   * The student's next registered class. Small and cheap on purpose — the pet
   * companion polls it, so it must not be the /classes payload.
   */
  app.get('/next', { preHandler: requireRole('student') }, async (request) => {
    const studentId = currentStudentId(request)

    const registrations = await prisma.liveClassRegistration.findMany({
      where: {
        studentId,
        liveClass: { status: { in: ['scheduled', 'live'] } },
      },
      include: { liveClass: { include: studentInclude } },
      orderBy: { liveClass: { scheduledAt: 'asc' } },
      take: 5,
    })

    const next = registrations.find(
      (r) => effectiveLiveClassStatus(r.liveClass) !== 'ended',
    )
    return { class: next ? serializeClass(next.liveClass, next) : null }
  })

  /** Everything the student registered for, upcoming and past. */
  app.get('/my-classes', { preHandler: requireRole('student') }, async (request) => {
    const studentId = currentStudentId(request)

    const registrations = await prisma.liveClassRegistration.findMany({
      where: { studentId },
      include: { liveClass: { include: studentInclude } },
      orderBy: { liveClass: { scheduledAt: 'desc' } },
    })

    const serialized = registrations.map((r) => serializeClass(r.liveClass, r))
    return {
      upcoming: serialized.filter((c) => c.status === 'scheduled' || c.status === 'live').reverse(),
      past: serialized.filter((c) => c.status === 'ended' || c.status === 'cancelled'),
    }
  })

  /**
   * The on-demand library: ended lectures with a published, ready recording.
   *
   * Open to every student who could see the class, registered or not — a
   * recording nobody can find is not a library. Registration is still created
   * lazily on first watch so progress has somewhere to live.
   */
  app.get('/recordings', { preHandler: requireRole('student') }, async (request) => {
    const user = currentUser(request)
    const studentId = currentStudentId(request)
    const filter = liveClassSearchSchema.parse(request.query ?? {})
    const orgIds = await orgIdsForUser(user.sub)

    const classes = await prisma.liveClass.findMany({
      where: {
        recordingPublishedAt: { not: null },
        recordingMedia: { status: 'ready', deletedAt: null },
        ...visibilityFilter(orgIds),
        ...(filter.language ? { language: filter.language } : {}),
        ...(filter.skill ? { skill: filter.skill } : {}),
      },
      include: studentInclude,
      orderBy: { recordingPublishedAt: 'desc' },
    })

    const mine = await prisma.liveClassRegistration.findMany({
      where: { studentId, classId: { in: classes.map((c) => c.id) } },
    })
    const byClass = new Map(mine.map((r) => [r.classId, r]))

    const q = filter.q?.toLowerCase()
    return {
      recordings: classes
        .filter((c) => {
          if (!q) return true
          return `${c.title} ${c.description ?? ''} ${c.mentor.user.name}`.toLowerCase().includes(q)
        })
        .map((c) => serializeClass(c, byClass.get(c.id))),
    }
  })

  /** One class — upcoming detail, or the recording page once it has ended. */
  app.get('/classes/:id', { preHandler: requireRole('student') }, async (request) => {
    const user = currentUser(request)
    const studentId = currentStudentId(request)
    const { id } = request.params as { id: string }
    const orgIds = await orgIdsForUser(user.sub)

    const cls = await prisma.liveClass.findFirst({
      where: { id, ...visibilityFilter(orgIds) },
      include: studentInclude,
    })
    if (!cls) throw notFound('Class not found')

    const registration = await prisma.liveClassRegistration.findUnique({
      where: { classId_studentId: { classId: id, studentId } },
    })

    return { class: serializeClass(cls, registration) }
  })

  app.post('/classes/:id/register', { preHandler: requireRole('student') }, async (request) => {
    const user = currentUser(request)
    const studentId = currentStudentId(request)
    const { id } = request.params as { id: string }
    const orgIds = await orgIdsForUser(user.sub)

    await register(id, studentId, orgIds)
    return { ok: true }
  })

  /**
   * Give up a seat. Only before it starts — leaving a class you already attended
   * would erase the attendance record, which is the one thing a college is
   * buying evidence of.
   */
  app.delete('/classes/:id/register', { preHandler: requireRole('student') }, async (request) => {
    const studentId = currentStudentId(request)
    const { id } = request.params as { id: string }

    const registration = await prisma.liveClassRegistration.findUnique({
      where: { classId_studentId: { classId: id, studentId } },
      include: { liveClass: true },
    })
    if (!registration) throw notFound('You are not registered for that class')
    if (registration.attendedAt) {
      throw conflict('You already attended this class', 'ALREADY_ATTENDED')
    }
    if (effectiveLiveClassStatus(registration.liveClass) === 'live') {
      throw conflict('That class is already under way', 'CLASS_LIVE')
    }

    await prisma.liveClassRegistration.delete({ where: { id: registration.id } })
    return { ok: true }
  })

  /**
   * Enter the room. This is the only route that hands out joinUrl, and it marks
   * attendance in the same breath — the link and the record of using it should
   * never be able to disagree.
   */
  app.post('/classes/:id/join', { preHandler: requireRole('student') }, async (request) => {
    const user = currentUser(request)
    const studentId = currentStudentId(request)
    const { id } = request.params as { id: string }
    const orgIds = await orgIdsForUser(user.sub)

    const cls = await prisma.liveClass.findFirst({
      where: { id, ...visibilityFilter(orgIds) },
    })
    if (!cls) throw notFound('Class not found')

    const registration = await prisma.liveClassRegistration.findUnique({
      where: { classId_studentId: { classId: id, studentId } },
    })
    if (!registration) throw forbidden('Register for this class first')

    const { canJoin, reason } = joinability(cls)
    if (!canJoin) throw conflict(reason ?? 'You cannot join this class yet', 'JOIN_CLOSED')

    if (!registration.attendedAt) {
      await prisma.liveClassRegistration.update({
        where: { id: registration.id },
        data: { attendedAt: new Date() },
      })
    }

    return { joinUrl: cls.joinUrl }
  })

  /**
   * Watch progress on a recording.
   *
   * Creates the registration row if the student is watching a class they never
   * signed up for — which is the normal path through the library.
   */
  app.post('/recordings/:id/progress', { preHandler: requireRole('student') }, async (request) => {
    const user = currentUser(request)
    const studentId = currentStudentId(request)
    const { id } = request.params as { id: string }
    const body = recordingProgressSchema.parse(request.body ?? {})
    const orgIds = await orgIdsForUser(user.sub)

    const cls = await prisma.liveClass.findFirst({
      where: { id, ...visibilityFilter(orgIds) },
      include: { recordingMedia: true },
    })
    if (!cls) throw notFound('Class not found')
    if (!cls.recordingPublishedAt) throw badRequest('That class has no recording', 'NO_RECORDING')

    const existing = await prisma.liveClassRegistration.findUnique({
      where: { classId_studentId: { classId: id, studentId } },
    })
    if (!existing) {
      await prisma.liveClassRegistration.create({ data: { classId: id, studentId } })
    }

    const updated = await saveProgress({
      classId: id,
      studentId,
      watchedSeconds: body.watchedSeconds,
      totalSeconds: cls.recordingMedia?.durationSeconds ?? null,
    })

    return {
      ok: true,
      watchedSeconds: updated.watchedSeconds,
      completedAt: updated.completedAt,
    }
  })

  // -------------------------------------------------------------------------
  // Mentor: schedule, run, publish
  // -------------------------------------------------------------------------

  /** The mentor's own classes, newest first. */
  app.get('/mentor/classes', { preHandler: requireRole('mentor') }, async (request) => {
    const mentorId = currentMentorId(request)

    const classes = await prisma.liveClass.findMany({
      where: { mentorId },
      include: { recordingMedia: true, _count: { select: { registrations: true } } },
      orderBy: { scheduledAt: 'desc' },
    })

    const serialized = classes.map(serializeForMentor)
    return {
      upcoming: serialized.filter((c) => c.status === 'scheduled' || c.status === 'live').reverse(),
      past: serialized.filter((c) => c.status === 'ended' || c.status === 'cancelled'),
    }
  })

  /** Who signed up, and who actually turned up. */
  app.get('/mentor/classes/:id', { preHandler: requireRole('mentor') }, async (request) => {
    const mentorId = currentMentorId(request)
    const { id } = request.params as { id: string }
    const cls = await ownedClass(id, mentorId)

    const registrations = await prisma.liveClassRegistration.findMany({
      where: { classId: id },
      include: { student: { include: { user: true, cohort: true } } },
      orderBy: { registeredAt: 'asc' },
    })

    return {
      class: serializeForMentor(cls),
      roster: registrations.map((r) => ({
        studentId: r.student.id,
        name: r.student.user.name,
        cohort: r.student.cohort?.name ?? null,
        registeredAt: r.registeredAt,
        attendedAt: r.attendedAt,
        watchedSeconds: r.watchedSeconds,
        completedAt: r.completedAt,
      })),
      attendedCount: registrations.filter((r) => r.attendedAt).length,
    }
  })

  app.post('/classes', { preHandler: requireRole('mentor') }, async (request, reply) => {
    const mentorId = currentMentorId(request)
    const body = createLiveClassSchema.parse(request.body)

    const cls = await prisma.liveClass.create({
      data: {
        mentorId,
        title: body.title,
        description: body.description ?? null,
        skill: body.skill ?? null,
        language: body.language,
        scheduledAt: body.scheduledAt,
        durationMinutes: body.durationMinutes,
        capacity: body.capacity,
        joinUrl: body.joinUrl ?? null,
      },
    })

    return reply.code(201).send({ id: cls.id })
  })

  app.patch('/classes/:id', { preHandler: requireRole('mentor') }, async (request) => {
    const mentorId = currentMentorId(request)
    const { id } = request.params as { id: string }
    const body = updateLiveClassSchema.parse(request.body ?? {})
    const cls = await ownedClass(id, mentorId)

    if (effectiveLiveClassStatus(cls) === 'ended') {
      throw conflict('That class has ended — edit its recording instead', 'CLASS_ENDED')
    }

    const updated = await prisma.liveClass.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.skill !== undefined ? { skill: body.skill } : {}),
        ...(body.language !== undefined ? { language: body.language } : {}),
        ...(body.scheduledAt !== undefined ? { scheduledAt: body.scheduledAt } : {}),
        ...(body.durationMinutes !== undefined ? { durationMinutes: body.durationMinutes } : {}),
        ...(body.capacity !== undefined ? { capacity: body.capacity } : {}),
        ...(body.joinUrl !== undefined ? { joinUrl: body.joinUrl } : {}),
      },
    })

    return { ok: true, id: updated.id }
  })

  /** Open the room. This is what flips students from "waiting" to "join". */
  app.post('/classes/:id/start', { preHandler: requireRole('mentor') }, async (request) => {
    const mentorId = currentMentorId(request)
    const { id } = request.params as { id: string }
    const cls = await ownedClass(id, mentorId)

    if (cls.status === 'cancelled') throw conflict('That class was cancelled', 'CLASS_CANCELLED')
    if (!cls.joinUrl) {
      // Starting without a room would show every student a Join button that
      // goes nowhere. Refuse here rather than let them find out by tapping it.
      throw badRequest('Add a room link before starting the class', 'NO_JOIN_URL')
    }

    await prisma.liveClass.update({
      where: { id },
      data: { status: 'live', startedAt: cls.startedAt ?? new Date() },
    })
    return { ok: true }
  })

  app.post('/classes/:id/end', { preHandler: requireRole('mentor') }, async (request) => {
    const mentorId = currentMentorId(request)
    const { id } = request.params as { id: string }
    await ownedClass(id, mentorId)

    await prisma.liveClass.update({
      where: { id },
      data: { status: 'ended', endedAt: new Date() },
    })
    return { ok: true }
  })

  /**
   * Attach the recording and publish it in one step.
   *
   * Ending the class is implied: publishing a recording of a lecture the system
   * still thinks is running makes no sense, and requiring the mentor to press
   * two buttons in the right order is how recordings go missing.
   */
  app.post('/classes/:id/recording', { preHandler: requireRole('mentor') }, async (request) => {
    const mentorId = currentMentorId(request)
    const user = currentUser(request)
    const { id } = request.params as { id: string }
    const body = publishRecordingSchema.parse(request.body)
    await ownedClass(id, mentorId)

    const media = await prisma.mediaAsset.findUnique({ where: { id: body.mediaId } })
    if (!media || media.deletedAt) throw notFound('Recording not found')
    if (media.ownerUserId !== user.sub) throw forbidden('That is not your upload')
    if (media.kind !== 'lecture_recording') {
      throw badRequest('That media asset is not a lecture recording', 'WRONG_MEDIA_KIND')
    }
    if (media.status !== 'ready') {
      throw badRequest('That upload has not finished yet', 'MEDIA_NOT_READY')
    }

    if (body.durationSeconds && !media.durationSeconds) {
      await prisma.mediaAsset.update({
        where: { id: media.id },
        data: { durationSeconds: body.durationSeconds },
      })
    }

    await prisma.liveClass.update({
      where: { id },
      data: {
        recordingMediaId: media.id,
        recordingPublishedAt: new Date(),
        status: 'ended',
        endedAt: new Date(),
      },
    })

    return { ok: true }
  })

  /** Unpublish — the class stays, the recording stops being listed. */
  app.delete('/classes/:id/recording', { preHandler: requireRole('mentor') }, async (request) => {
    const mentorId = currentMentorId(request)
    const { id } = request.params as { id: string }
    await ownedClass(id, mentorId)

    await prisma.liveClass.update({
      where: { id },
      data: { recordingMediaId: null, recordingPublishedAt: null },
    })
    return { ok: true }
  })

  /**
   * Cancel. Soft on purpose: registrations are left in place so the students who
   * had signed up can still see what happened to it, and so the cancellation is
   * visible in the college's engagement data rather than vanishing.
   */
  app.delete('/classes/:id', { preHandler: requireRole('mentor') }, async (request) => {
    const mentorId = currentMentorId(request)
    const { id } = request.params as { id: string }
    await ownedClass(id, mentorId)

    await prisma.liveClass.update({ where: { id }, data: { status: 'cancelled' } })
    return { ok: true }
  })
}
