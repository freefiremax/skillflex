/**
 * Canonical enum-ish values.
 *
 * These are String columns in the database, not DB enums — the React app needs
 * the exact same value sets and labels, and it cannot import a Prisma enum. One
 * definition here, enforced at the API edge by the zod contracts, beats two
 * definitions that drift.
 */

export const ROLES = ['student', 'mentor', 'college_admin', 'platform_admin'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  student: 'Student',
  mentor: 'Mentor',
  college_admin: 'College Admin',
  platform_admin: 'Platform Admin',
}

export const ORG_ROLES = ['student', 'college_admin'] as const
export type OrgRole = (typeof ORG_ROLES)[number]

/** Language is a matching dimension between student and mentor, not a subtitle. */
export const SUPPORTED_LANGUAGES = ['en', 'hi', 'mr'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  hi: 'हिंदी / Hindi',
  mr: 'मराठी / Marathi',
}

export const SKILLS = [
  'self_introduction',
  'group_discussion',
  'presentation',
  'interview_answering',
  'body_language',
  'email_writing',
  'teamwork',
  'conflict_handling',
] as const
export type Skill = (typeof SKILLS)[number]

export const SKILL_LABELS: Record<Skill, string> = {
  self_introduction: 'Self Introduction',
  group_discussion: 'Group Discussion',
  presentation: 'Presentation',
  interview_answering: 'Interview Answering',
  body_language: 'Body Language',
  email_writing: 'Email Writing',
  teamwork: 'Teamwork',
  conflict_handling: 'Conflict Handling',
}

export const SUBMISSION_STATUSES = [
  'draft',
  'uploading',
  'submitted',
  'in_review',
  'reviewed',
] as const
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]

export const MEDIA_KINDS = ['lesson_video', 'submission_video', 'lecture_recording'] as const
export type MediaKind = (typeof MEDIA_KINDS)[number]

export const MEDIA_STATUSES = ['pending', 'ready', 'failed', 'deleted'] as const
export type MediaStatus = (typeof MEDIA_STATUSES)[number]

// ---------------------------------------------------------------------------
// Live lectures + their recordings.
//
// A LiveClass is one-to-many: one mentor teaching a room of students. That is a
// different thing from the 1:1 LiveSession booked off MentorAvailability, and
// they stay separate models on purpose — a lecture has capacity, registration
// and a recording, and a 1:1 has none of those.
// ---------------------------------------------------------------------------

export const LIVE_CLASS_STATUSES = ['scheduled', 'live', 'ended', 'cancelled'] as const
export type LiveClassStatus = (typeof LIVE_CLASS_STATUSES)[number]

export const LIVE_CLASS_STATUS_LABELS: Record<LiveClassStatus, string> = {
  scheduled: 'Scheduled',
  live: 'Live now',
  ended: 'Ended',
  cancelled: 'Cancelled',
}

/**
 * The room opens this long before the scheduled start. Students arriving early
 * is the normal case, not an edge case, and a locked door at 10:59 for an 11:00
 * class reads as a broken product.
 */
export const LIVE_CLASS_JOIN_LEAD_MINUTES = 10

/**
 * And it stays open this long past the scheduled end. Lectures overrun, and the
 * scheduled duration is the mentor's estimate rather than a contract.
 */
export const LIVE_CLASS_JOIN_GRACE_MINUTES = 20

/** How much of a recording counts as having watched it. */
export const RECORDING_COMPLETE_FRACTION = 0.9

/**
 * When the room is enterable. Derived from the schedule rather than stored, so
 * it cannot drift out of sync with a rescheduled class.
 */
export function liveClassJoinWindow(scheduledAt: Date, durationMinutes: number) {
  const start = scheduledAt.getTime()
  return {
    opensAt: new Date(start - LIVE_CLASS_JOIN_LEAD_MINUTES * 60_000),
    closesAt: new Date(start + (durationMinutes + LIVE_CLASS_JOIN_GRACE_MINUTES) * 60_000),
  }
}

/**
 * The status to actually show, which is not always the stored one.
 *
 * Mentors forget to press "End" — every video product learns this — and a class
 * left at `live` three days later would sit at the top of every student's list
 * claiming to be in progress. So `ended` is derived from the clock once the join
 * window has closed, and the stored value wins only while it is still plausible.
 *
 * `live` is deliberately NOT derived: a class whose start time has passed but
 * which the mentor has not started yet is not live, and saying so would send
 * students into an empty room. The UI says "waiting for the mentor" instead.
 */
export function effectiveLiveClassStatus(input: {
  status: string
  scheduledAt: Date
  durationMinutes: number
}): LiveClassStatus {
  if (input.status === 'cancelled') return 'cancelled'
  if (input.status === 'ended') return 'ended'
  const { closesAt } = liveClassJoinWindow(input.scheduledAt, input.durationMinutes)
  if (Date.now() > closesAt.getTime()) return 'ended'
  return input.status === 'live' ? 'live' : 'scheduled'
}

/**
 * Why a student left a mentor. This is the compounding data asset — a
 * competitor repositioning into Indian placement-readiness can copy the
 * switch button but not this history.
 */
export const SWITCH_REASON_CODES = [
  'language_mismatch',
  'teaching_style',
  'feedback_too_slow',
  'feedback_not_useful',
  'scheduling',
  'want_different_skill_focus',
  'initial_assignment',
  'other',
] as const
export type SwitchReasonCode = (typeof SWITCH_REASON_CODES)[number]

export const SWITCH_REASON_LABELS: Record<SwitchReasonCode, string> = {
  language_mismatch: "Language didn't work for me",
  teaching_style: "Teaching style didn't suit me",
  feedback_too_slow: 'Feedback took too long',
  feedback_not_useful: "Feedback wasn't useful",
  scheduling: 'Timings never matched',
  want_different_skill_focus: 'I want to focus on a different skill',
  initial_assignment: 'First mentor assignment',
  other: 'Something else',
}

export const CONSENT_SCOPES = ['video_recording', 'data_processing', 'marketing'] as const
export type ConsentScope = (typeof CONSENT_SCOPES)[number]

/**
 * Consent copy is user-facing legal text, not a label. Written so a 19-year-old
 * reading it on a phone understands what they are actually agreeing to.
 */
export const CONSENT_SCOPE_LABELS: Record<ConsentScope, string> = {
  video_recording:
    'Record and store my practice videos so a human mentor can watch them and write feedback.',
  data_processing:
    'Store my scores and feedback, and share aggregate (non-video) progress with my college.',
  marketing: 'Send me product updates by email.',
}

/** Bump when the consent copy changes — DPDP wants versioned consent. */
export const CURRENT_POLICY_VERSION = '2026-08-v1'

/** Student video retention window. Deletion job reads this. */
export const SUBMISSION_RETENTION_DAYS = 365

/** Anti-thrash guard on mentor switching. */
export const SWITCH_COOLDOWN_DAYS = 7

/**
 * Monday 00:00 India time, as a UTC instant. Weekly plans are keyed by this.
 *
 * It must not read the server's local timezone, which is what `getDay()` and
 * `setHours()` do. That made the week boundary depend on which machine answered
 * the request: the seed ran on an IST laptop and wrote 2026-08-23T18:30:00Z,
 * then a Vercel container (always UTC) computed 2026-08-24T00:00:00Z for the
 * same real week, failed to find the existing row, and inserted a second plan
 * for one week. Both showed up in the student's history.
 *
 * A fixed +05:30 is exact rather than a simplification — India has one timezone
 * and has never observed DST — so no tz database is needed. Shift into IST, floor
 * to Monday there using the UTC accessors (which ignore the host's zone), shift
 * back. The result is the same instant on every machine.
 */
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000

export function startOfWeekIST(at: Date): Date {
  const ist = new Date(at.getTime() + IST_OFFSET_MS)
  ist.setUTCDate(ist.getUTCDate() - ((ist.getUTCDay() + 6) % 7)) // Monday = 0
  ist.setUTCHours(0, 0, 0, 0)
  return new Date(ist.getTime() - IST_OFFSET_MS)
}

/**
 * The India-time calendar day an instant falls in, as `YYYY-MM-DD`.
 *
 * Same reasoning as `startOfWeekIST` above, and the same trap: a practice
 * streak computed with `toDateString()` breaks at 00:00 UTC, which is 05:30 IST
 * — so a student practising before breakfast would be credited to the previous
 * day on Vercel and the current one on their own laptop.
 */
export function istDayKey(at: Date): string {
  return new Date(at.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10)
}
