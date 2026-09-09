/**
 * Effort score — the only thing the leaderboard ranks.
 *
 * The constraint threaded through the whole product is "no AI scores anyone",
 * and a leaderboard is the place most likely to break it, because ranking is
 * grading. So this score is built from a single kind of input: objective facts
 * about what a student DID. Words cleared, day streak, submissions, live
 * lectures attended, plan items ticked. None of these is a judgement of quality,
 * and none is a machine verdict — a pronunciation attempt logged with
 * `matched: true` is a fact about a word, not a grade on a person.
 *
 * The score is deliberately NOT a rubric average or any feedback-derived
 * quality measure. Publishing one student's mentor-written assessment on a
 * board in front of their classmates is the exact thing this column of the
 * product exists to avoid. `leaderboardScore` never sees rubricScores — the
 * signature makes that structurally true, not merely customary.
 *
 * Every sub-score is capped so grinding one avenue (clearing 900 words, say)
 * does not swamp the rest. The caps are constants rather than tunable
 * product logic so the score is stable and explainable.
 */

export interface EffortFacts {
  wordsCleared: number
  streakDays: number
  submissionsCount: number
  liveAttended: number
  planItemsDone: number
  /** Rounds of the battle games where the student got every item right. */
  battlesWon: number
}

/** Caps for each contributing fact. Halving anything here changes the score. */
export const EFFORT_CAPS = {
  wordsCleared: 60,
  streakDays: 30,
  submissionsCount: 12,
  liveAttended: 12,
  planItemsDone: 25,
  battlesWon: 20,
} as const

/**
 * Pure and total: the same facts give the same number everywhere, so the
 * leaderboard on the phone and on the desktop never disagree about rank.
 */
export function leaderboardScore(f: EffortFacts): number {
  const words = Math.min(f.wordsCleared, EFFORT_CAPS.wordsCleared)
  const streak = Math.min(f.streakDays, EFFORT_CAPS.streakDays)
  const subs = Math.min(f.submissionsCount, EFFORT_CAPS.submissionsCount)
  const live = Math.min(f.liveAttended, EFFORT_CAPS.liveAttended)
  const plan = Math.min(f.planItemsDone, EFFORT_CAPS.planItemsDone)
  const battles = Math.min(f.battlesWon, EFFORT_CAPS.battlesWon)

  return words + streak * 2 + subs * 3 + live * 3 + plan + battles * 2
}
