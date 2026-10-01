/**
 * Mentor load / health — Phase 3 of the Closed-Loop Mentorship plan.
 *
 * This is a DETECTION layer, not a punishment one. The plan is explicit (§9, §15
 * F/G): a mentor observer must "detect → explain → improve → re-evaluate", never
 * "score → shame → remove". So this module deliberately does two things and
 * stops:
 *   1. classifies load into healthy | watch | overloaded, and
 *   2. says, in plain words, WHY and what a human might do about it.
 *
 * It never reassigns students, pauses a mentor, or writes anything. Those are
 * human decisions the plan says to *recommend and support*, not automate.
 *
 * Every input here is an operational fact already in the schema (open
 * assignments, unreviewed submissions, feedback timestamps) — none of it is an
 * AI judgement about a person, so this stays clear of the "humans assess, not
 * AI" wall the rest of the product is built around.
 *
 * The thresholds below are a PROPOSED starting rule, not an authoritative one.
 * They should be tuned against real cohort data before anyone is held to them.
 */

export const MENTOR_HEALTH_STATUSES = ['healthy', 'watch', 'overloaded'] as const
export type MentorHealthStatus = (typeof MENTOR_HEALTH_STATUSES)[number]

export const MENTOR_HEALTH_LABELS: Record<MentorHealthStatus, string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  overloaded: 'Overloaded',
}

/** Raw, human-verifiable signals. Each is a fact, not an inference. */
export interface MentorLoadMetrics {
  /** Open MentorAssignment rows (endedAt == null). */
  activeStudents: number
  /** The mentor's own configured cap (MentorProfile.maxActiveStudents). */
  maxActiveStudents: number
  /** Submissions submitted/in_review with no feedback yet, for current students. */
  pendingReviews: number
  /** Mean (feedback.createdAt − submission.submittedAt) over the last 30 days, in hours. null = no reviews in window. */
  avgReviewDelayHours: number | null
  /** How long the single oldest unreviewed submission has waited, in hours. null = nothing pending. */
  oldestPendingHours: number | null
}

/**
 * Trigger points per level. A signal at the `overloaded` point makes the mentor
 * overloaded; at the `watch` point, watch. The worst single signal wins — one
 * genuinely stuck dimension matters even if the others look fine.
 */
export const MENTOR_HEALTH_THRESHOLDS = {
  watch: {
    loadRatio: 0.8,
    pendingReviews: 5,
    avgReviewDelayHours: 48,
    oldestPendingHours: 72,
  },
  overloaded: {
    loadRatio: 1.0,
    pendingReviews: 10,
    avgReviewDelayHours: 72,
    oldestPendingHours: 120,
  },
} as const

export interface MentorHealthAssessment {
  status: MentorHealthStatus
  /** One line per signal that is elevated. Empty when healthy. */
  reasons: string[]
  /** Non-punitive next step for a human, scaled to the status. */
  recommendation: string
}

/** "18h", "3 days" — coarse on purpose; nobody needs minute precision here. */
function formatHours(hours: number): string {
  const h = Math.round(hours)
  if (h < 48) return `${h}h`
  return `${Math.round(h / 24)} days`
}

function recommend(status: MentorHealthStatus): string {
  switch (status) {
    case 'overloaded':
      return (
        'Open an improvement window with this mentor, and consider pausing new assignments ' +
        'or moving a few students to a mentor with spare capacity. This is a recommendation ' +
        'for a human to action, not an automatic change.'
      )
    case 'watch':
      return (
        'Worth a light check-in. A short conversation now usually clears a backlog before it ' +
        'builds — no load change needed yet.'
      )
    case 'healthy':
      return 'No action needed. Load and turnaround are within healthy ranges.'
  }
}

/**
 * Pure classifier. Same inputs → same output, no I/O, no clock — the caller
 * passes already-computed metrics so this stays testable and shareable between
 * the API and the React app (same pattern as effectiveLiveClassStatus).
 */
export function assessMentorHealth(metrics: MentorLoadMetrics): MentorHealthAssessment {
  const {
    activeStudents,
    maxActiveStudents,
    pendingReviews,
    avgReviewDelayHours,
    oldestPendingHours,
  } = metrics
  const t = MENTOR_HEALTH_THRESHOLDS
  const loadRatio = maxActiveStudents <= 0 ? 0 : activeStudents / maxActiveStudents

  const reasons: string[] = []
  // 0 healthy, 1 watch, 2 overloaded — the worst signal sets the status.
  let level = 0
  const bump = (to: number) => {
    if (to > level) level = to
  }

  if (loadRatio >= t.overloaded.loadRatio) {
    bump(2)
    reasons.push(`Carrying ${activeStudents} of ${maxActiveStudents} student slots — at or over the cap.`)
  } else if (loadRatio >= t.watch.loadRatio) {
    bump(1)
    reasons.push(`Carrying ${activeStudents} of ${maxActiveStudents} student slots — close to the cap.`)
  }

  if (pendingReviews >= t.overloaded.pendingReviews) {
    bump(2)
    reasons.push(`${pendingReviews} reviews are waiting in the queue.`)
  } else if (pendingReviews >= t.watch.pendingReviews) {
    bump(1)
    reasons.push(`${pendingReviews} reviews are waiting in the queue.`)
  }

  if (avgReviewDelayHours !== null) {
    if (avgReviewDelayHours >= t.overloaded.avgReviewDelayHours) {
      bump(2)
      reasons.push(`Reviews are taking ${formatHours(avgReviewDelayHours)} on average over the last 30 days.`)
    } else if (avgReviewDelayHours >= t.watch.avgReviewDelayHours) {
      bump(1)
      reasons.push(`Reviews are taking ${formatHours(avgReviewDelayHours)} on average over the last 30 days.`)
    }
  }

  if (oldestPendingHours !== null) {
    if (oldestPendingHours >= t.overloaded.oldestPendingHours) {
      bump(2)
      reasons.push(`The oldest unreviewed submission has been waiting ${formatHours(oldestPendingHours)}.`)
    } else if (oldestPendingHours >= t.watch.oldestPendingHours) {
      bump(1)
      reasons.push(`The oldest unreviewed submission has been waiting ${formatHours(oldestPendingHours)}.`)
    }
  }

  const status: MentorHealthStatus =
    level === 2 ? 'overloaded' : level === 1 ? 'watch' : 'healthy'

  return { status, reasons, recommendation: recommend(status) }
}
