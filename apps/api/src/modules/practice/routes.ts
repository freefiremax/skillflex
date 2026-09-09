import type { FastifyInstance } from 'fastify'
import { prisma } from '@skillflex/db'
import { istDayKey, recordAttemptSchema, startOfWeekIST } from '@skillflex/shared'
import { currentStudentId, requireRole } from '../../lib/auth.js'

/**
 * Pronunciation practice — a drill, not an assessment.
 *
 * This is the one place in the product where a machine listens to a student
 * speak, so the wall the README promises has to be visible in the code:
 *
 *   - nothing here writes to Feedback, so `buildWeeklyPlan()` cannot reach it;
 *   - `PronunciationAttempt` has no score column to read even if it could;
 *   - there is no mentor route and no org route over this table, so neither a
 *     mentor nor a college ever sees it. It is the student's own scratchpad.
 *
 * The judging itself is client-side (`judgePronunciation` in
 * packages/shared/src/pronunciation.ts) because the audio never leaves the
 * browser — the Web Speech API does the recognition and we only ever receive
 * the text it produced. That is also why `matched` arrives from the client
 * rather than being recomputed here: we do not have the audio to recheck it,
 * and this data drives nothing but a streak counter, so there is nothing to
 * gain by pretending otherwise.
 */
export async function practiceRoutes(app: FastifyInstance) {
  /** Log one attempt. */
  app.post('/attempts', { preHandler: requireRole('student') }, async (request, reply) => {
    const studentId = currentStudentId(request)
    const body = recordAttemptSchema.parse(request.body)

    const attempt = await prisma.pronunciationAttempt.create({
      data: {
        studentId,
        wordId: body.wordId ?? null,
        word: body.word,
        heard: body.heard ?? null,
        matched: body.matched,
        engine: body.engine,
      },
    })

    reply.code(201)
    return { attempt: { id: attempt.id, createdAt: attempt.createdAt } }
  })

  /**
   * The one-line summary above the drill. Counts only — no accuracy percentage,
   * for the same reason the table has no score column.
   */
  app.get('/summary', { preHandler: requireRole('student') }, async (request) => {
    const studentId = currentStudentId(request)
    const weekStart = startOfWeekIST(new Date())

    // 60 days is enough to compute any believable streak and keeps this a small
    // read. Streaks are computed in application code rather than SQL because
    // the day boundary is India time, not the database's timezone.
    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    const attempts = await prisma.pronunciationAttempt.findMany({
      where: { studentId, createdAt: { gte: since } },
      select: { word: true, matched: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

    const clearedWords = new Set<string>()
    const practisedDays = new Set<string>()
    let thisWeek = 0

    for (const a of attempts) {
      if (a.matched) clearedWords.add(a.word.toLowerCase())
      practisedDays.add(istDayKey(a.createdAt))
      if (a.createdAt >= weekStart) thisWeek++
    }

    // Forgiving by one day: at 00:01 IST a real streak has not been broken yet,
    // it just has not been continued. Resetting it to zero overnight would
    // punish the clock rather than the student.
    const today = new Date()
    let cursor = practisedDays.has(istDayKey(today))
      ? today
      : new Date(today.getTime() - 24 * 60 * 60 * 1000)
    let streakDays = 0
    while (practisedDays.has(istDayKey(cursor))) {
      streakDays++
      cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000)
    }

    return {
      summary: {
        wordsCleared: clearedWords.size,
        attemptsThisWeek: thisWeek,
        streakDays,
        /** Rendered verbatim by the client, same pattern as the org report's `note`. */
        note: 'Practice history is yours alone. No mentor and no college can see it, and it never becomes part of your plan.',
      },
    }
  })
}
