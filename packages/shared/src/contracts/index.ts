import { z } from 'zod'
import {
  ROLES,
  SUPPORTED_LANGUAGES,
  SKILLS,
  SWITCH_REASON_CODES,
  CONSENT_SCOPES,
} from '../enums.js'

/** Shared primitives */
export const cuid = z.string().min(1)
export const emailSchema = z.string().email().toLowerCase().trim()
export const passwordSchema = z.string().min(8, 'At least 8 characters')

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(ROLES).default('student'),
  /** Colleges are joined by slug at signup; mentors pass nothing. */
  orgSlug: z.string().min(2).optional(),
  preferredLanguages: z.array(z.enum(SUPPORTED_LANGUAGES)).min(1).default(['en', 'hi']),
  /** DPDP: video consent must be explicit and captured at signup. */
  consentVideoRecording: z.boolean().default(false),
  guardianName: z.string().min(2).optional(),
  guardianEmail: emailSchema.optional(),
})
export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
})
export type LoginInput = z.infer<typeof loginSchema>

// ---------------------------------------------------------------------------
// Curriculum
// ---------------------------------------------------------------------------

export const rubricCriterionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  max: z.number().int().min(1).max(10).default(5),
})
export type RubricCriterion = z.infer<typeof rubricCriterionSchema>

export const createTrackSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'lowercase-with-dashes'),
  title: z.string().min(2),
  description: z.string().optional(),
  order: z.number().int().default(0),
})

export const createAssignmentSchema = z.object({
  lessonId: cuid,
  title: z.string().min(2),
  brief: z.string().min(10),
  rubric: z.array(rubricCriterionSchema).min(1),
  maxDurationSeconds: z.number().int().min(15).max(600).default(120),
})

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

export const createSubmissionSchema = z.object({
  assignmentId: cuid,
  mediaId: cuid,
  note: z.string().max(1000).optional(),
})
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>

// ---------------------------------------------------------------------------
// Feedback — human authored. rubricScores is the structured half that rolls
// up into the accreditation dashboard; freeform is the mentorship half.
// ---------------------------------------------------------------------------

export const createFeedbackSchema = z.object({
  submissionId: cuid,
  rubricScores: z.record(z.string(), z.number().int().min(0).max(10)),
  freeform: z.string().min(20, 'Give the student something real to work with'),
  strengths: z.string().max(2000).optional(),
  nextStep: z.string().max(2000).optional(),
})
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>

// ---------------------------------------------------------------------------
// Mentorship
// ---------------------------------------------------------------------------

export const mentorSearchSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES).optional(),
  skill: z.enum(SKILLS).optional(),
  q: z.string().max(120).optional(),
})

export const switchMentorSchema = z.object({
  toMentorId: cuid,
  reasonCode: z.enum(SWITCH_REASON_CODES),
  note: z.string().max(1000).optional(),
})
export type SwitchMentorInput = z.infer<typeof switchMentorSchema>

export const updateMentorProfileSchema = z.object({
  headline: z.string().max(200).optional(),
  bio: z.string().max(4000).optional(),
  languages: z.array(z.enum(SUPPORTED_LANGUAGES)).min(1).optional(),
  skills: z.array(z.enum(SKILLS)).optional(),
  maxActiveStudents: z.number().int().min(1).max(200).optional(),
  isAcceptingStudents: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// Org / admin
// ---------------------------------------------------------------------------

export const createOrgSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  state: z.string().optional(),
  city: z.string().optional(),
  seats: z.number().int().min(1).default(100),
})

export const createCohortSchema = z.object({
  name: z.string().min(2),
  year: z.number().int().min(2000).max(2100),
})

// ---------------------------------------------------------------------------
// Live lectures + recordings
// ---------------------------------------------------------------------------

/**
 * Plain object, no refinements — `.partial()` below needs it to still be a
 * ZodObject, and a `.refine()` would turn it into a ZodEffects that has no
 * `.partial()`.
 */
const liveClassFields = z.object({
  title: z.string().min(4).max(160),
  description: z.string().max(4000).optional(),
  /** Ties a lecture to the same skill vocabulary mentors are matched on. */
  skill: z.enum(SKILLS).optional(),
  language: z.enum(SUPPORTED_LANGUAGES).default('en'),
  scheduledAt: z.coerce.date(),
  durationMinutes: z.number().int().min(10).max(240).default(45),
  capacity: z.number().int().min(1).max(1000).default(100),
  /** Whatever room the mentor is using — Meet, Zoom, Jitsi. */
  joinUrl: z.string().url().max(500).optional(),
})

export const createLiveClassSchema = liveClassFields.extend({
  /**
   * A minute of slack rather than a hard `> now`: the mentor's clock, the
   * browser's clock and the server's clock are never quite the same, and
   * rejecting "in 30 seconds" as being in the past is indefensible.
   */
  scheduledAt: z.coerce
    .date()
    .refine((d) => d.getTime() > Date.now() - 60_000, 'Pick a time in the future'),
})
export type CreateLiveClassInput = z.infer<typeof createLiveClassSchema>

/** Reschedule/retitle. Every field optional; the past-time guard is dropped so
 *  a mentor can still correct the details of a class already under way. */
export const updateLiveClassSchema = liveClassFields.partial()
export type UpdateLiveClassInput = z.infer<typeof updateLiveClassSchema>

export const liveClassSearchSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES).optional(),
  skill: z.enum(SKILLS).optional(),
  q: z.string().max(120).optional(),
})

export const publishRecordingSchema = z.object({
  mediaId: cuid,
  durationSeconds: z.number().int().min(1).max(6 * 60 * 60).optional(),
})

export const recordingProgressSchema = z.object({
  watchedSeconds: z.number().int().min(0).max(6 * 60 * 60),
})

// ---------------------------------------------------------------------------
// Consent (DPDP)
// ---------------------------------------------------------------------------

export const grantConsentSchema = z.object({
  scope: z.enum(CONSENT_SCOPES),
  granted: z.boolean(),
  guardianName: z.string().min(2).optional(),
  guardianEmail: emailSchema.optional(),
})
