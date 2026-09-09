import { prisma, readObjectList, readRecord } from '@skillflex/db'
import { leaderboardScore, type EffortFacts } from '@skillflex/shared'

/**
 * Effort facts for a student, read straight from rows the student's own actions
 * created. Every field here is an objective count — nothing here is a quality
 * judgement, and nothing here reads `Feedback.rubricScores` (that is the
 * human-judgement half of the level, computed separately and never used to rank
 * peers). This is the "what did you do" side of the ledger.
 */
export async function loadEffortFacts(studentId: string): Promise<EffortFacts> {
  const [words, streak, subs, live, plan, battles] = await Promise.all([
    // Distinct words cleared, judged client-side in the drill.
    prisma.pronunciationAttempt.findMany({
      where: { studentId, matched: true },
      select: { wordId: true },
      distinct: ['wordId'],
    }),
    // Day streak, recomputed in app code (never SQL) so the IST boundary is
    // honoured — see the practice module's own derivation.
    streakDays(studentId),
    prisma.submission.count({ where: { studentId, status: { in: ['submitted', 'in_review', 'reviewed'] } } }),
    prisma.liveClassRegistration.count({ where: { studentId, attendedAt: { not: null } } }),
    countPlanItemsDone(studentId),
    // Perfect* rounds of the battle games. A "won" round means every item was
    // right against a fixed answer key — objective, not quality. Two-column
    // comparison isn't expressible in a Prisma `where`, so read the rows and
    // count in JS; one student's battle history is small by construction.
    prisma.battleAttempt
      .findMany({
        where: { studentId },
        select: { score: true, total: true },
      })
      .then((rows) => rows.filter((r) => r.score === r.total).length),
  ])

  return {
    wordsCleared: words.length,
    streakDays: streak,
    submissionsCount: subs,
    liveAttended: live,
    planItemsDone: plan,
    battlesWon: battles,
  }
}

/**
 * The effort score used by BOTH the level breakdown (the "effort" half) and the
 * leaderboard. Kept in one place so the number the student sees is the same
 * number the college board shows.
 */
export function effortScore(facts: EffortFacts): number {
  return leaderboardScore(facts)
}

/**
 * Average rubric score across a student's feedback, as a percentage 0–100.
 * This is the ONLY human-judgement number that feeds the level. It is read
 * here — never into the leaderboard, which must not leak one student's mentor
 * assessment to their classmates.
 *
 * Rubric keys are per-assignment, so scores are normalised against each
 * assignment's own `max` before averaging; raw sums across mixed rubrics would
 * make one easy assignment worth more than a hard one.
 */
export async function averageRubricPct(studentId: string): Promise<number> {
  const feedback = await prisma.feedback.findMany({
    where: { submission: { studentId } },
    include: { submission: { include: { assignment: true } } },
    orderBy: { createdAt: 'desc' },
  })

  if (feedback.length === 0) return 0

  let total = 0
  let criteria = 0
  for (const f of feedback) {
    const rubric = readObjectList<{ key: string; max: number }>(f.submission.assignment.rubric)
    const scores = readRecord(f.rubricScores)
    for (const criterion of rubric) {
      const max = Number(criterion?.max)
      const score = Number(scores[criterion?.key ?? ''] ?? 0)
      if (max > 0) {
        total += Math.min(100, (score / max) * 100)
        criteria += 1
      }
    }
  }

  return criteria === 0 ? 0 : Math.round(total / criteria)
}

/** The level — a pure fold over the two halves. Read here, never stored. */
export async function computeLevel(studentId: string) {
  const [facts, human] = await Promise.all([
    loadEffortFacts(studentId),
    averageRubricPct(studentId),
  ])
  const effort = effortScore(facts)
  // Combined 0–100, human judgement weighted 50 / effort weighted 50.
  const combined = (Math.min(human, 100) + Math.min(effort, 100)) / 2
  return { facts, human, effort, combined }
}

/**
 * Day streak, the same boundary-safe derivation the practice module uses.
 * Recomputing here instead of importing keeps the module self-contained; the
 * two must stay in step, so any change to one is a bug in both.
 */
async function streakDays(studentId: string): Promise<number> {
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
  const attempts = await prisma.pronunciationAttempt.findMany({
    where: { studentId, createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  const dayKey = (at: Date) => {
    const off = (5 * 60 + 30) * 60 * 1000
    return new Date(at.getTime() + off).toISOString().slice(0, 10)
  }

  const days = new Set(attempts.map((a) => dayKey(a.createdAt)))
  const today = new Date()
  let cursor = days.has(dayKey(today)) ? today : new Date(today.getTime() - 86400000)
  let streak = 0
  while (days.has(dayKey(cursor))) {
    streak += 1
    cursor = new Date(cursor.getTime() - 86400000)
  }
  return streak
}

/** Ticks across all the student's weekly plans. Effort, not judgement. */
async function countPlanItemsDone(studentId: string): Promise<number> {
  const plans = await prisma.weeklyPlan.findMany({
    where: { studentId },
    select: { items: true },
  })
  let done = 0
  for (const plan of plans) {
    const items = readObjectList<{ done?: boolean }>(plan.items)
    done += items.filter((i) => i?.done).length
  }
  return done
}
