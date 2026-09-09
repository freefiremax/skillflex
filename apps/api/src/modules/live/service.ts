import { prisma } from '@skillflex/db'
import {
  RECORDING_COMPLETE_FRACTION,
  effectiveLiveClassStatus,
  liveClassJoinWindow,
  type Language,
  type LiveClassStatus,
} from '@skillflex/shared'
import { HttpError } from '../../lib/auth.js'
import { mediaProvider } from '../../lib/media.js'

/**
 * The subset of a LiveClass every serializer here needs. Written as a structural
 * type rather than a Prisma payload type so these helpers can be called with a
 * `select`ed row as well as a full one.
 */
interface ClassRow {
  id: string
  mentorId: string
  orgId: string | null
  title: string
  description: string | null
  skill: string | null
  language: string
  status: string
  scheduledAt: Date
  durationMinutes: number
  capacity: number
  joinUrl: string | null
  startedAt: Date | null
  endedAt: Date | null
  recordingMediaId: string | null
  recordingPublishedAt: Date | null
}

interface MentorRow {
  id: string
  headline: string | null
  user: { name: string }
}

interface RegistrationRow {
  id: string
  registeredAt: Date
  attendedAt: Date | null
  watchedSeconds: number
  completedAt: Date | null
}

/**
 * Who a student is allowed to see. A lecture is open to everyone unless it was
 * scoped to a single college, which is the same argument as the mentor pool:
 * cross-institutional by default, private only when someone asks for it.
 */
export function visibilityFilter(orgIds: string[]) {
  return { OR: [{ orgId: null }, { orgId: { in: orgIds } }] }
}

/** Every college this user belongs to. Usually exactly one; zero for mentors. */
export async function orgIdsForUser(userId: string): Promise<string[]> {
  const memberships = await prisma.orgMembership.findMany({
    where: { userId },
    select: { orgId: true },
  })
  return memberships.map((m) => m.orgId)
}

/**
 * Whether the room is enterable right now.
 *
 * Two separate conditions, and both matter: the clock has to be inside the join
 * window, AND the mentor has to have actually started the class. A student let
 * into an empty room because the schedule said 11:00 concludes the product is
 * broken, not that the mentor is late.
 */
export function joinability(cls: ClassRow): {
  status: LiveClassStatus
  canJoin: boolean
  opensAt: Date
  closesAt: Date
  reason: string | null
} {
  const status = effectiveLiveClassStatus(cls)
  const { opensAt, closesAt } = liveClassJoinWindow(cls.scheduledAt, cls.durationMinutes)
  const now = Date.now()

  let reason: string | null = null
  if (status === 'cancelled') reason = 'This class was cancelled.'
  else if (status === 'ended') reason = 'This class has ended.'
  else if (now < opensAt.getTime()) reason = 'The room opens shortly before the start time.'
  else if (cls.status !== 'live') reason = 'Waiting for the mentor to start the class.'
  else if (!cls.joinUrl) reason = 'The mentor has not attached a room link yet.'

  return { status, canJoin: reason === null, opensAt, closesAt, reason }
}

/**
 * A playable URL for a published recording.
 *
 * Mirrors curriculum's pickAsset(): trust the stored playbackUrl first (it is
 * what /media/:id/complete wrote, already signed for private buckets), and fall
 * back to deriving one from externalId for the local dev provider.
 */
function recordingUrl(media: {
  status: string
  playbackUrl: string | null
  externalId: string | null
  deletedAt: Date | null
} | null): string | null {
  if (!media || media.deletedAt || media.status !== 'ready') return null
  if (media.playbackUrl) return media.playbackUrl
  return media.externalId ? mediaProvider.playbackUrlFor(media.externalId) : null
}

/** Shape sent to students for a lecture in a list or on its own page. */
export function serializeClass(
  cls: ClassRow & {
    mentor: MentorRow
    recordingMedia?: {
      status: string
      playbackUrl: string | null
      externalId: string | null
      deletedAt: Date | null
      durationSeconds: number | null
    } | null
    _count?: { registrations: number }
  },
  registration?: RegistrationRow | null,
) {
  const { status, canJoin, opensAt, closesAt, reason } = joinability(cls)
  const registered = Boolean(registration)
  const seatsTaken = cls._count?.registrations ?? 0

  /**
   * "A recording exists" and "we can play it" are two different questions, and
   * conflating them is what made an ended lecture claim nothing had been
   * published while sitting in the library. This is the first question, and it
   * is deliberately the same test the /recordings SQL filter and
   * serializeForMentor() use — those three disagreeing is the bug.
   */
  const media = cls.recordingMedia ?? null
  const hasRecording = Boolean(
    cls.recordingPublishedAt && media && !media.deletedAt && media.status === 'ready',
  )
  /** And this is the second: null here means the player shows "unavailable". */
  const recordingPlaybackUrl = hasRecording ? recordingUrl(media) : null

  return {
    id: cls.id,
    title: cls.title,
    description: cls.description,
    skill: cls.skill,
    language: cls.language as Language,
    status,
    scheduledAt: cls.scheduledAt,
    durationMinutes: cls.durationMinutes,
    capacity: cls.capacity,
    seatsTaken,
    seatsLeft: Math.max(0, cls.capacity - seatsTaken),
    isFull: seatsTaken >= cls.capacity,
    mentor: {
      id: cls.mentor.id,
      name: cls.mentor.user.name,
      headline: cls.mentor.headline,
    },
    joinOpensAt: opensAt,
    joinClosesAt: closesAt,
    canJoin: canJoin && registered,
    joinBlockedReason: registered ? reason : 'Register first to get the room link.',
    /** Never leaked before the room opens — see the /join route. */
    joinUrl: canJoin && registered ? cls.joinUrl : null,
    isRegistered: registered,
    attendedAt: registration?.attendedAt ?? null,
    /** Both null until the mentor actually runs it — see effectiveLiveClassStatus. */
    startedAt: cls.startedAt,
    endedAt: cls.endedAt,
    hasRecording,
    recordingPublishedAt: cls.recordingPublishedAt,
    recordingPlaybackUrl,
    recordingDurationSeconds: cls.recordingMedia?.durationSeconds ?? null,
    watchedSeconds: registration?.watchedSeconds ?? 0,
    completedAt: registration?.completedAt ?? null,
  }
}

/** Mentor-facing shape: the roster and the room link, no join gating. */
export function serializeForMentor(
  cls: ClassRow & {
    recordingMedia?: { status: string; deletedAt: Date | null; durationSeconds: number | null } | null
    _count?: { registrations: number }
  },
) {
  const seatsTaken = cls._count?.registrations ?? 0
  const media = cls.recordingMedia ?? null
  return {
    id: cls.id,
    title: cls.title,
    description: cls.description,
    skill: cls.skill,
    language: cls.language as Language,
    status: effectiveLiveClassStatus(cls),
    storedStatus: cls.status,
    scheduledAt: cls.scheduledAt,
    durationMinutes: cls.durationMinutes,
    capacity: cls.capacity,
    seatsTaken,
    joinUrl: cls.joinUrl,
    startedAt: cls.startedAt,
    endedAt: cls.endedAt,
    /** Same test as serializeClass() and the /recordings filter — keep them equal. */
    hasRecording: Boolean(
      cls.recordingPublishedAt && media && !media.deletedAt && media.status === 'ready',
    ),
    recordingPublishedAt: cls.recordingPublishedAt,
  }
}

/** Load a class the mentor owns, or refuse. */
export async function ownedClass(classId: string, mentorId: string) {
  const cls = await prisma.liveClass.findUnique({
    where: { id: classId },
    include: { recordingMedia: true, _count: { select: { registrations: true } } },
  })
  if (!cls) throw new HttpError(404, 'Class not found')
  if (cls.mentorId !== mentorId) throw new HttpError(403, 'That is not your class')
  return cls
}

/**
 * Register a student, guarding capacity and the class being still upcoming.
 *
 * The unique constraint on (classId, studentId) is what actually makes this
 * safe under concurrency — two taps on a slow connection race, and the second
 * one has to be a no-op rather than a second seat. So an existing row is
 * treated as success.
 */
export async function register(classId: string, studentId: string, orgIds: string[]) {
  const cls = await prisma.liveClass.findFirst({
    where: { id: classId, ...visibilityFilter(orgIds) },
    include: { _count: { select: { registrations: true } } },
  })
  if (!cls) throw new HttpError(404, 'Class not found')

  const existing = await prisma.liveClassRegistration.findUnique({
    where: { classId_studentId: { classId, studentId } },
  })
  if (existing) return existing

  const status = effectiveLiveClassStatus(cls)
  if (status === 'cancelled') throw new HttpError(409, 'That class was cancelled', 'CLASS_CANCELLED')
  if (status === 'ended') {
    throw new HttpError(409, 'That class has already ended', 'CLASS_ENDED')
  }
  if (cls._count.registrations >= cls.capacity) {
    throw new HttpError(409, 'That class is full', 'CLASS_FULL')
  }

  try {
    return await prisma.liveClassRegistration.create({ data: { classId, studentId } })
  } catch (err) {
    // Lost the race described above. The other request created the row, which
    // is the outcome this caller wanted anyway.
    if ((err as { code?: string }).code === 'P2002') {
      return prisma.liveClassRegistration.findUniqueOrThrow({
        where: { classId_studentId: { classId, studentId } },
      })
    }
    throw err
  }
}

/**
 * Save watch progress on a recording.
 *
 * Monotonic: `watchedSeconds` only ever moves forward. Scrubbing back to
 * rewatch a bit must not undo a completion, and a stale in-flight request
 * arriving late must not either.
 */
export async function saveProgress(input: {
  classId: string
  studentId: string
  watchedSeconds: number
  totalSeconds: number | null
}) {
  const { classId, studentId, watchedSeconds, totalSeconds } = input

  const existing = await prisma.liveClassRegistration.findUnique({
    where: { classId_studentId: { classId, studentId } },
  })
  if (!existing) throw new HttpError(404, 'You are not registered for that class')

  const furthest = Math.max(existing.watchedSeconds, watchedSeconds)
  const completed =
    existing.completedAt ??
    (totalSeconds && furthest >= totalSeconds * RECORDING_COMPLETE_FRACTION ? new Date() : null)

  return prisma.liveClassRegistration.update({
    where: { id: existing.id },
    data: { watchedSeconds: furthest, completedAt: completed },
  })
}
