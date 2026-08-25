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

export const MEDIA_KINDS = ['lesson_video', 'submission_video'] as const
export type MediaKind = (typeof MEDIA_KINDS)[number]

export const MEDIA_STATUSES = ['pending', 'ready', 'failed', 'deleted'] as const
export type MediaStatus = (typeof MEDIA_STATUSES)[number]

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
