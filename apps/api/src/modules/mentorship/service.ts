import { prisma, readList } from '@skillswitch/db'
import {
  SWITCH_COOLDOWN_DAYS,
  type Language,
  type SwitchReasonCode,
} from '@skillswitch/shared'
import { HttpError } from '../../lib/auth.js'

/**
 * Count of a mentor's currently-active students (open MentorAssignment rows).
 * Capacity is enforced against this so the pool can't collapse onto one mentor.
 */
async function activeStudentCount(mentorId: string): Promise<number> {
  return prisma.mentorAssignment.count({ where: { mentorId, endedAt: null } })
}

export async function mentorHasCapacity(mentorId: string): Promise<boolean> {
  const mentor = await prisma.mentorProfile.findUnique({ where: { id: mentorId } })
  if (!mentor || !mentor.isAcceptingStudents) return false
  const active = await activeStudentCount(mentorId)
  return active < mentor.maxActiveStudents
}

export async function currentMentorFor(studentId: string) {
  return prisma.mentorAssignment.findFirst({
    where: { studentId, endedAt: null },
    include: { mentor: { include: { user: true } } },
    orderBy: { startedAt: 'desc' },
  })
}

/**
 * Pick a mentor for a brand-new student: language overlap first (the whole
 * multilingual premise), then most spare capacity to keep the pool balanced.
 */
export async function assignInitialMentor(userId: string) {
  const student = await prisma.studentProfile.findUnique({ where: { userId } })
  if (!student) return null

  const already = await currentMentorFor(student.id)
  if (already) return already

  const langs = readList(student.preferredLanguages) as Language[]
  const candidates = await prisma.mentorProfile.findMany({
    where: { isAcceptingStudents: true },
    include: { user: true },
  })

  const ranked = (
    await Promise.all(
      candidates.map(async (m) => {
        const active = await activeStudentCount(m.id)
        if (active >= m.maxActiveStudents) return null
        const mentorLangs = readList(m.languages) as Language[]
        const overlap = mentorLangs.filter((l) => langs.includes(l)).length
        const spare = m.maxActiveStudents - active
        return { mentor: m, overlap, spare }
      }),
    )
  ).filter((x): x is NonNullable<typeof x> => x !== null)

  if (ranked.length === 0) return null

  ranked.sort((a, b) => b.overlap - a.overlap || b.spare - a.spare)
  const pick = ranked[0]!

  await prisma.$transaction([
    prisma.mentorAssignment.create({
      data: { studentId: student.id, mentorId: pick.mentor.id },
    }),
    prisma.mentorSwitchEvent.create({
      data: {
        studentId: student.id,
        fromMentorId: null,
        toMentorId: pick.mentor.id,
        reasonCode: 'initial_assignment',
      },
    }),
  ])

  return currentMentorFor(student.id)
}

/**
 * The switch. Append-only: close the current assignment, open a new one, log
 * the reason. Guarded by a cooldown (anti-thrash) and the target's capacity.
 */
export async function switchMentor(input: {
  studentId: string
  toMentorId: string
  reasonCode: SwitchReasonCode
  note?: string
}) {
  const { studentId, toMentorId, reasonCode, note } = input

  const target = await prisma.mentorProfile.findUnique({ where: { id: toMentorId } })
  if (!target) throw new HttpError(404, 'That mentor does not exist')

  const active = await currentMentorFor(studentId)
  if (active?.mentorId === toMentorId) {
    throw new HttpError(409, 'That is already your mentor', 'SAME_MENTOR')
  }

  // Anti-thrash: block a switch within the cooldown window of the last one.
  //
  // Counted from the last switch the student actually *chose*, not from the
  // current assignment's startedAt — a new student never picked their automatic
  // initial mentor, and locking them out of correcting it for a week would
  // break the one promise the product is built on.
  const lastChosenSwitch = await prisma.mentorSwitchEvent.findFirst({
    where: { studentId, reasonCode: { not: 'initial_assignment' } },
    orderBy: { createdAt: 'desc' },
  })
  if (lastChosenSwitch) {
    const since = Date.now() - lastChosenSwitch.createdAt.getTime()
    const cooldownMs = SWITCH_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
    if (since < cooldownMs) {
      const daysLeft = Math.ceil((cooldownMs - since) / (24 * 60 * 60 * 1000))
      throw new HttpError(
        429,
        `You switched recently — you can switch again in ${daysLeft} day(s)`,
        'SWITCH_COOLDOWN',
      )
    }
  }

  if (!(await mentorHasCapacity(toMentorId))) {
    throw new HttpError(409, 'That mentor is at capacity right now', 'MENTOR_FULL')
  }

  await prisma.$transaction(async (tx) => {
    if (active) {
      await tx.mentorAssignment.update({
        where: { id: active.id },
        data: { endedAt: new Date() },
      })
    }
    await tx.mentorAssignment.create({ data: { studentId, mentorId: toMentorId } })
    await tx.mentorSwitchEvent.create({
      data: {
        studentId,
        fromMentorId: active?.mentorId ?? null,
        toMentorId,
        reasonCode,
        note: note ?? null,
      },
    })
  })

  return currentMentorFor(studentId)
}

/** Directory search: filter by language and/or skill, hide full mentors. */
export async function searchMentors(filter: { language?: Language; skill?: string; q?: string }) {
  const mentors = await prisma.mentorProfile.findMany({
    where: { isAcceptingStudents: true },
    include: { user: true },
  })

  const results = await Promise.all(
    mentors.map(async (m) => {
      const languages = readList(m.languages) as Language[]
      const skills = readList(m.skills)
      const active = await activeStudentCount(m.id)
      return {
        id: m.id,
        name: m.user.name,
        headline: m.headline,
        bio: m.bio,
        languages,
        skills,
        hasCapacity: active < m.maxActiveStudents,
        spare: Math.max(0, m.maxActiveStudents - active),
      }
    }),
  )

  return results.filter((m) => {
    if (filter.language && !m.languages.includes(filter.language)) return false
    if (filter.skill && !m.skills.includes(filter.skill)) return false
    if (filter.q) {
      const hay = `${m.name} ${m.headline ?? ''} ${m.bio ?? ''}`.toLowerCase()
      if (!hay.includes(filter.q.toLowerCase())) return false
    }
    return true
  })
}
