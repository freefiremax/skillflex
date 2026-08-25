import type { FastifyInstance } from 'fastify'
import { env } from '../../lib/env.js'
import { unauthorized } from '../../lib/auth.js'
import { purgeExpiredMedia } from '../../jobs/retention.js'

/**
 * Machine-only routes. No JWT here — the caller is Vercel Cron, not a user, so
 * auth is a shared secret instead.
 */
export async function internalRoutes(app: FastifyInstance) {
  /**
   * DPDP retention sweep.
   *
   * GET because Vercel Cron only issues GETs, and it sends CRON_SECRET as a
   * bearer token automatically. Idempotent and bounded (200 rows per run), so a
   * duplicate or retried invocation is harmless.
   */
  app.get('/retention', async (request, reply) => {
    // An unset secret means the route is closed, not open. Same 401 either way
    // so a caller can't probe whether it's configured.
    if (!env.CRON_SECRET) {
      request.log.warn('retention cron hit but CRON_SECRET is not configured')
      throw unauthorized('Not authorised')
    }
    if (request.headers.authorization !== `Bearer ${env.CRON_SECRET}`) {
      throw unauthorized('Not authorised')
    }

    const purged = await purgeExpiredMedia(request.log)
    return reply.send({ ok: true, purged })
  })
}
