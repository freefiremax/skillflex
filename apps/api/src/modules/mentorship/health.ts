import { prisma } from '@skillflex/db'
import {
  assessMentorHealth,
  type MentorHealthStatus,
  type MentorLoadMetrics,
} from '@skillflex/shared'
import { notFound } from '../../lib/auth.js'

const HOUR_MS = 60 * 60 * 1000
/** Turnaround is averaged over a trailing window so one slow week long ago fades. */
const REVIEW_WINDOW_DAYS = 30

export interface MentorHealthEntry {
  mentorId: string
  name: string
  metrics: MentorLoadMetrics
  status: MentorHealthStatus
  reasons: string[]
  recommendation: string
}

/**
 * Gather the raw load signals for one mentor. Every value is a fact already in
 * the schema — open assignments, unreviewed submissions, feedback timestamps —
 * not an inference about anyone.
 *
 * "Pending" and "oldest pending" are scoped to the mentor's CURRENT students
 * (open assignment), matching the review-queue route: a submission follows the
 * student to whoever mentors them now.
 */
async function metricsFor(mentorId: string, maxActiveStudents: number): Promise<MentorLoadMetrics> {
  const now = Date.now()
  const windowStart = new Date(now - REVIEW_WINDOW_DAYS * 24 * HOUR_MS)
  const pendingWhere = {
    status: { in: ['submitted', 'in_review'] },
    feedback: null,
    student: { mentorAssignments: { some: { mentorId, endedAt: null } } },
  }

  const [activeStudents, pendingReviews, recentFeedback, oldestPending] = await Promise.all([
    prisma.mentorAssignment.count({ where: { mentorId, endedAt: null } }),
    prisma.submission.count({ where: pendingWhere }),
    prisma.feedback.findMany({
      where: { mentorId, createdAt: { gte: windowStart } },
      select: { createdAt: true, submission: { select: { submittedAt: true } } },
    }),
    prisma.submission.findFirst({
      where: { ...pendingWhere, submittedAt: { not: null } },
      orderBy: { submittedAt: 'asc' },
      select: { submittedAt: true },
    }),
  ])

  // Mean (reviewed − submitted). Skip rows missing submittedAt rather than
  // counting them as instant, and guard against clock-skew negatives.
  const delays: number[] = []
  for (const f of recentFeedback) {
    const submittedAt = f.submission.submittedAt
    if (!submittedAt) continue
    const hours = (f.createdAt.getTime() - submittedAt.getTime()) / HOUR_MS
    if (hours >= 0) delays.push(hours)
  }
  const avgReviewDelayHours =
    delays.length === 0 ? null : delays.reduce((a, b) => a + b, 0) / delays.length

  const oldestPendingHours =
    oldestPending?.submittedAt == null
      ? null
      : (now - oldestPending.submittedAt.getTime()) / HOUR_MS

  return { activeStudents, maxActiveStudents, pendingReviews, avgReviewDelayHours, oldestPendingHours }
}

/** Load metrics for one mentor, without the classification. */
export async function computeMentorLoad(mentorId: string): Promise<MentorLoadMetrics> {
  const mentor = await prisma.mentorProfile.findUnique({
    where: { id: mentorId },
    select: { maxActiveStudents: true },
  })
  if (!mentor) throw notFound('Mentor not found')
  return metricsFor(mentorId, mentor.maxActiveStudents)
}

/** Metrics + status + reasons + recommendation for one mentor. */
export async function mentorHealthFor(mentorId: string): Promise<MentorHealthEntry> {
  const mentor = await prisma.mentorProfile.findUnique({
    where: { id: mentorId },
    select: { maxActiveStudents: true, user: { select: { name: true } } },
  })
  if (!mentor) throw notFound('Mentor not found')
  const metrics = await metricsFor(mentorId, mentor.maxActiveStudents)
  return { mentorId, name: mentor.user.name, metrics, ...assessMentorHealth(metrics) }
}

/**
 * Every mentor's health, worst-first, for the platform-admin view. Fans out one
 * small batch of counts per mentor — fine at the mentor counts this platform
 * has; revisit with a grouped query if the pool grows large.
 */
export async function mentorHealthReport(): Promise<MentorHealthEntry[]> {
  const mentors = await prisma.mentorProfile.findMany({
    select: { id: true, maxActiveStudents: true, user: { select: { name: true } } },
  })

  const entries = await Promise.all(
    mentors.map(async (m) => {
      const metrics = await metricsFor(m.id, m.maxActiveStudents)
      return { mentorId: m.id, name: m.user.name, metrics, ...assessMentorHealth(metrics) }
    }),
  )

  const rank: Record<MentorHealthStatus, number> = { overloaded: 0, watch: 1, healthy: 2 }
  return entries.sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      b.metrics.pendingReviews - a.metrics.pendingReviews ||
      a.name.localeCompare(b.name),
  )
}
