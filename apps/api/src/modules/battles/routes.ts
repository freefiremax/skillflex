import type { FastifyInstance } from 'fastify'
import { prisma } from '@skillflex/db'
import { recordBattleAttemptSchema } from '@skillflex/shared'
import { currentStudentId, requireRole } from '../../lib/auth.js'

/**
 * Battle results.
 *
 * Like the practice module, this stores FACTS of effort and never a grade. The
 * client does the judging — it checks a spelling/answer string or a quiz option
 * exactly like the drill checks a transcript — and this route only records how
 * many the round contained and how many were right. That is a count, the same
 * spirit as `PronunciationAttempt.matched`, and the `BattleAttempt` model has
 * no confidence or quality column because there is no machine judgement to
 * hold. A battle win therefore feeds the leaderboard's effort score but can
 * never be re-read as a score of the student.
 */
export async function battleRoutes(app: FastifyInstance) {
  /** Log one completed round. */
  app.post('/attempts', { preHandler: requireRole('student') }, async (request, reply) => {
    const studentId = currentStudentId(request)
    const body = recordBattleAttemptSchema.parse(request.body)

    const attempt = await prisma.battleAttempt.create({
      data: {
        studentId,
        mode: body.mode,
        score: body.score,
        total: body.total,
        durationSeconds: body.durationSeconds,
      },
    })

    reply.code(201)
    return { attempt: { id: attempt.id, createdAt: attempt.createdAt } }
  })

  /** The student's own battle summary — rounds, best, wins. */
  app.get('/summary', { preHandler: requireRole('student') }, async (request) => {
    const studentId = currentStudentId(request)
    const attempts = await prisma.battleAttempt.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      select: { mode: true, score: true, total: true, createdAt: true },
    })

    // "Won" = every item right against the fixed key. Objective, not a score.
    const rounds = attempts.length
    const wins = attempts.filter((a) => a.score === a.total).length
    const best = attempts.reduce((m, a) => Math.max(m, a.score), 0)

    const byMode = { spelling: 0, sentence: 0, quiz: 0 }
    for (const a of attempts) {
      if (a.mode === 'spelling' || a.mode === 'sentence' || a.mode === 'quiz') {
        byMode[a.mode] += 1
      }
    }

    return {
      summary: {
        rounds,
        wins,
        best,
        byMode,
        note: 'Battles record how many you got right against a fixed answer key. They are effort, not a score on you.',
      },
    }
  })
}
