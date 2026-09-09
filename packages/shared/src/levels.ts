/**
 * Student progression levels.
 *
 * This is the "grading system" the product shows a student, and it is built to
 * satisfy the one constraint that outranks every feature on this page: **no AI
 * assesses a student.** The level is DERIVED ONLY, never stored, and is composed
 * of exactly two kinds of input, both of which are already in the database and
 * neither of which a machine judged:
 *
 *   1. HUMAN rubric scores — `Feedback.rubricScores`, written by a mentor who
 *      watched the student's video. This is the only grading in the product.
 *   2. EFFORT facts — the count of things the student actually did: submitted
 *      assignments, cleared words in the drill, attended live lectures, ticked
 *      plan items. These are objective counts, not judgement.
 *
 * Nothing here is an AI score, a pronunciation accuracy percentage, or any other
 * machine verdict. `derivedLevel()` is a pure function over aggregate counts —
 * it folds hand-written mentor feedback plus effort into a tier, exactly the way
 * a mentor glancing at a student's history would.
 *
 * The four tiers are a ladder, not a score. The graded output of any single
 * assignment does not pass `beginner`; only accumulated human-reviewed work plus
 * sustained effort does. `god_mode` in particular is deliberately gated behind
 * BOTH a high average rubric score (which only a human wrote) AND a large body
 * of effort, so no single lucky submission reaches it.
 */

export const LEVELS = ['beginner', 'intermediate', 'experienced', 'god_mode'] as const
export type Level = (typeof LEVELS)[number]

export const LEVEL_LABELS: Record<Level, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  experienced: 'Experienced',
  god_mode: 'God Mode',
}

/** Ordered low → high; index is the ladder rung. */
export const LEVEL_ORDER: Record<Level, number> = {
  beginner: 0,
  intermediate: 1,
  experienced: 2,
  god_mode: 3,
}

/**
 * The inputs `derivedLevel()` needs. All are counts a route or the web app can
 * produce from existing rows — there is no store of levels, so there is no
 * "who wrote this value" question to answer. Everything is recomputed on read.
 */
export interface LevelInput {
  /** COUNT of mentor feedback rows, not the scores — the body of human review. */
  feedbackCount: number
  /** Average rubric score across feedback, 0–100. Mirrors the mentor's scale. */
  avgRubricPct: number
  /** Assignments with status submitted|in_review|reviewed. */
  submissionsCount: number
  /** Distinct word ids cleared in the pronunciation drill. */
  wordsCleared: number
  /** Current day streak in the drill. */
  streakDays: number
  /** Live class registrations that reached the room (attendedAt set). */
  liveAttended: number
  /** Weekly plan items the student ticked done. */
  planItemsDone: number
}

export interface LevelResult {
  level: Level
  label: string
  /** The ladder rung, 0–3. */
  rung: number
  /** How close to the NEXT tier, 0–100. `god_mode` is always 100. */
  progressPct: number
  nextLabel: Level | null
  /** Where the score came from — shown to the student for honesty. */
  breakdown: {
    humanRubric: { score: number; max: number; note: string }
    effort: { score: number; max: number; note: string }
  }
}

/** Effort is worth this much of the ladder (the rest is human-reviewed work). */
export const EFFORT_WEIGHT_PCT = 50

/**
 * The pure derivation. Not a model, not AI, not stored — a deterministic fold
 * over human feedback + objective effort, so the same student always gets the
 * same level regardless of which server answers.
 */
export function deriveLevel(input: LevelInput): LevelResult {
  // --- Effort half ---------------------------------------------------------
  // Score effort inside [0, 100]. None of these are judgement; each is a fact
  // about what the student did. Weighted by what the product considers durable.
  const effort = Math.min(
    100,
    input.streakDays * 2 +
      input.wordsCleared * 1.5 +
      input.submissionsCount * 3 +
      input.liveAttended * 3 +
      input.planItemsDone,
  )

  // --- Human half ----------------------------------------------------------
  // Average rubric percentage, treated as 0 when no feedback exists. Only a
  // mentor writes rubricScores, so this is grade signal, not machine signal.
  const human = input.feedbackCount > 0 ? Math.round(input.avgRubricPct) : 0

  // Combined, in the same units — both are /100.
  const combined = (human + effort) / 2

  // Fence-posts chosen so that a total beginner (no feedback, no effort) starts
  // at beginner, a few weeks of effort reaches intermediate, sustained human-
  // reviewed work reaches experienced, and god_mode needs BOTH a high human
  // average AND a near-full effort score. Because it's a weighted blend one
  // great score cannot carry the human half alone.
  let level: Level
  if (combined >= 80 && human >= 75 && effort >= 60) level = 'god_mode'
  else if (combined >= 60 && human >= 55) level = 'experienced'
  else if (combined >= 35) level = 'intermediate'
  else level = 'beginner'

  const rung = LEVEL_ORDER[level]
  const next = level === 'god_mode' ? null : LEVELS[rung + 1] ?? null

  // Progress to the next ladder rung. Pure measure of "how far along this
  // tier" — the web bar and the "next level" hint share it.
  let progressPct = 100
  if (next) {
    const nextThreshold = next === 'intermediate' ? 35 : next === 'experienced' ? 60 : 80
    const thisThreshold = rung === 0 ? 0 : next === 'god_mode' ? 60 : rung === 1 ? 35 : 60
    const span = nextThreshold - thisThreshold
    progressPct =
      span <= 0 ? 100 : Math.max(0, Math.min(100, Math.round(((combined - thisThreshold) / span) * 100)))
  }

  return {
    level,
    label: LEVEL_LABELS[level],
    rung,
    progressPct,
    nextLabel: next,
    breakdown: {
      humanRubric: {
        score: human,
        max: 100,
        note: human > 0 ? 'Average of your mentors’ rubric scores.' : 'No mentor feedback yet.',
      },
      effort: {
        score: Math.round(effort),
        max: 100,
        note: 'Counted from what you did — submissions, drills, lectures, plan items.',
      },
    },
  }
}
