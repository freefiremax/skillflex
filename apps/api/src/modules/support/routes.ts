import type { FastifyInstance } from 'fastify'
import { prisma } from '@skillflex/db'
import { sendSupportMessageSchema } from '@skillflex/shared'
import { HttpError, currentUser, requireAuth } from '../../lib/auth.js'
import { supportEngine, type SupportTurn } from './engine.js'

/**
 * AI Support — the in-app help chat.
 *
 * The only place a machine writes prose to a user, and it is scoped to the app:
 * broken screens, permissions, logins, "where is my feedback". The engine is
 * handed this conversation and a static description of the app, never anything
 * about the student's work, so the "no AI assesses anyone" rule holds by
 * construction rather than by prompt discipline alone. See ./engine.ts.
 *
 * Attached to User, not StudentProfile: mentors get stuck too.
 */

/** Turns kept for context and shown on reload. */
const HISTORY_LIMIT = 50

/** Per user, per hour. A support thread is not a chat app. */
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60 * 60 * 1000

/**
 * `support_messages` ships as a hand-run SQL file (add-support-messages.sql),
 * matching this project's no-migrations convention — so on a database where it
 * has not been run yet, every query against it throws P2021.
 *
 * That must not take the page down. A support chat whose whole purpose is
 * explaining breakage would be a poor thing to have break, and the person most
 * likely to hit this is the one who just deployed and has not run the SQL. So
 * reads degrade to an empty thread and writes degrade to not persisting; the
 * answer still arrives. Everything that is not P2021 rethrows.
 */
function isMissingTable(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && (err as { code?: unknown }).code === 'P2021')
}

export async function supportRoutes(app: FastifyInstance) {
  /** The caller's thread, oldest first — this is what the UI renders. */
  app.get('/history', { preHandler: requireAuth }, async (request) => {
    const { sub: userId } = currentUser(request)

    let rows: Array<{ id: string; sender: string; body: string; createdAt: Date }> = []
    try {
      // Newest-first with a take, then reversed: the index is
      // (userId, createdAt), and "the last 50" is a descending range on it. Asking
      // ascending would read the whole thread to find the tail.
      rows = await prisma.supportMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: HISTORY_LIMIT,
        select: { id: true, sender: true, body: true, createdAt: true },
      })
    } catch (err) {
      if (!isMissingTable(err)) throw err
      request.log.warn('support_messages is missing — run packages/db/prisma/add-support-messages.sql')
    }

    return {
      messages: rows.reverse().map((m) => ({
        id: m.id,
        sender: m.sender === 'user' ? 'user' : 'bot',
        body: m.body,
        at: m.createdAt,
      })),
      /** So the UI can say which engine answered instead of guessing. */
      engine: supportEngine.name,
    }
  })

  /** One turn: store what they said, answer it, store the answer. */
  app.post('/chat', { preHandler: requireAuth }, async (request, reply) => {
    const { sub: userId } = currentUser(request)
    const body = sendSupportMessageSchema.parse(request.body)

    let history: SupportTurn[] = []
    let persisted = true

    try {
      const since = new Date(Date.now() - RATE_WINDOW_MS)
      const recent = await prisma.supportMessage.count({
        where: { userId, sender: 'user', createdAt: { gte: since } },
      })
      if (recent >= RATE_LIMIT) {
        throw new HttpError(
          429,
          'That is a lot of messages in one hour. Take a break — everything you have written is saved, and a human can read the thread.',
          'SUPPORT_RATE_LIMITED',
        )
      }

      const rows = await prisma.supportMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: HISTORY_LIMIT,
        select: { sender: true, body: true },
      })
      history = rows
        .reverse()
        .map((m) => ({ sender: m.sender === 'user' ? 'user' : 'bot', body: m.body }))

      await prisma.supportMessage.create({
        data: { userId, sender: 'user', body: body.message },
      })
    } catch (err) {
      if (err instanceof HttpError) throw err
      if (!isMissingTable(err)) throw err
      request.log.warn('support_messages is missing — answering without saving the thread')
      persisted = false
    }

    history.push({ sender: 'user', body: body.message })

    let answer: string
    try {
      answer = await supportEngine.reply(history)
    } catch (err) {
      // The user's turn is already stored, so nothing they typed is lost — and a
      // thread with an unanswered message is an accurate record of what happened.
      // Report the failure rather than substituting a canned line, or a wrong key
      // looks like a bot with nothing to say.
      request.log.error({ err }, 'support engine failed')
      throw new HttpError(
        503,
        'The support assistant could not answer just now. Your message is saved — try again in a moment, or describe the problem again and a human will read it.',
        'SUPPORT_UNAVAILABLE',
      )
    }

    if (persisted) {
      try {
        await prisma.supportMessage.create({ data: { userId, sender: 'bot', body: answer } })
      } catch (err) {
        if (!isMissingTable(err)) throw err
      }
    }

    reply.code(201)
    return { reply: answer, engine: supportEngine.name, saved: persisted }
  })
}
