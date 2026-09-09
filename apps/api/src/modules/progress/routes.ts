import type { FastifyInstance } from 'fastify'
import { prisma } from '@skillflex/db'
import { deriveLevel, type LevelInput } from '@skillflex/shared'
import { currentStudentId, notFound, requireRole } from '../../lib/auth.js'
import { averageRubricPct, effortScore, loadEffortFacts } from './service.js'

/**
 * Student progress — a LEVEL, not a score.
 *
 * The whole product's guardrail is "no AI scores anyone", so this module has to
 * earn its place on every line:
 *
 *   - The level is DERIVED ON READ and never stored. There is no column holding
 *     a "current level", because a stored level is a machine-made verdict that
 *     lingers after the evidence for it is gone (delete a submission and the
 *     stored grade stays). Recomputing keeps it honest — and answers the "who
 *     wrote this?" question with "nobody; it is a view".
 *   - It is built ONLY from two inputs: human mentor feedback (Feedback.rubricScores)
 *     and objective effort counts (submissions, drill clears, lectures, plan
 *     ticks). Neither is an AI judgement.
 *   - THE LEADERBOARD RANKS EFFORT, NEVER QUALITY. This is the single most
 *     important line. A leaderboard that ranked rubric averages would publish
 *     one student's private mentor assessment to the whole college. So it sorts
 *     purely by the effort score — facts about what each student did — and is
 *     scoped to the student's own college.
 */
export async function progressRoutes(app: FastifyInstance) {
  /**
   * The student's current level, with the honest breakdown of where it came
   * from.
   */
  app.get('/me', { preHandler: requireRole('student') }, async (request) => {
    const studentId = currentStudentId(request)
    const [facts, human] = await Promise.all([
      loadEffortFacts(studentId),
      averageRubricPct(studentId),
    ])
    const effort = effortScore(facts)

    const feedback = await prisma.feedback.count({ where: { submission: { studentId } } })

    const input: LevelInput = {
      feedbackCount: feedback,
      avgRubricPct: human,
      submissionsCount: facts.submissionsCount,
      wordsCleared: facts.wordsCleared,
      streakDays: facts.streakDays,
      liveAttended: facts.liveAttended,
      planItemsDone: facts.planItemsDone,
    }
    const level = deriveLevel(input)

    return {
      level,
      effort: { score: effort, facts },
      humanRubric: { score: human, feedbackCount: feedback },
      note: 'Your level is derived from your mentors’ feedback plus what you actually did. No AI computes it, and nothing is stored.',
    }
  })

  /**
   * Top gainers within the student's own college. Ranks EFFORT, never quality.
   *
   * Scoped to the student's org (via cohort → org, or org membership). A
   * student with no college sees an empty board — there is no sensible "everyone
   * on the platform" board for a product where a lecture is private to a campus.
   */
  app.get('/leaderboard', { preHandler: requireRole('student') }, async (request) => {
    const studentId = currentStudentId(request)

    const profile = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        cohort: { include: { org: true } },
        user: true,
      },
    })
    if (!profile) throw notFound('Student profile not found')

    const orgId = profile.cohort?.orgId ?? null
    if (!orgId) {
      return {
        scopedTo: null,
        you: { name: profile.user.name, score: 0, rank: null },
        peers: [],
        note: 'You are not attached to a college yet, so there is no leaderboard to show.',
      }
    }

    // All students in the same org, via cohort membership.
    const peers = await prisma.studentProfile.findMany({
      where: { cohort: { orgId } },
      include: { user: true },
    })

    // Compute effort for each — bounded loop over one college's cohort, so an
    // N+1 here stays small. Facts only, never rubric averages.
    const rows = await Promise.all(
      peers.map(async (p) => {
        const facts = await loadEffortFacts(p.id)
        const score = effortScore(facts)
        return {
          studentId: p.id,
          name: p.user.name,
          score,
          facts,
          isYou: p.id === studentId,
        }
      }),
    )

    // Rank by score descending; ties share a rank. Never by name or id, so a
    // sort is deterministic but correct.
    const ordered = [...rows].sort((a, b) => b.score - a.score)
    let lastScore: number | null = null
    let lastRank = 0
    const ranked = ordered.map((r, i) => {
      const rank = r.score === lastScore ? lastRank : i + 1
      lastScore = r.score
      lastRank = rank
      return { ...r, rank, pos: i + 1 }
    })

    const you = ranked.find((r) => r.isYou) ?? null

    return {
      scopedTo: profile.cohort?.org.name ?? null,
      you: you ? { name: you.name, score: you.score, rank: you.rank } : null,
      peers: ranked.map((r) => ({
        studentId: r.studentId,
        name: r.name,
        score: r.score,
        rank: r.rank,
        isYou: r.isYou,
        facts: r.facts,
      })),
      // What the board does and doesn't mean, shown right beneath it.
      note: 'Ranks effort — words cleared, streak, submissions, lectures, plan ticks. It never ranks mentor feedback or any score on your work.',
    }
  })
}
