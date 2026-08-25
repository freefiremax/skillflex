import type { IncomingMessage, ServerResponse } from 'node:http'
import { buildApp } from './app.js'

/**
 * Vercel serverless entrypoint for the whole API.
 *
 * One catch-all function rather than a function per route: nine Fastify plugins
 * and a Prisma client is a lot to pay per cold start, and paying it nine times
 * over would be worse. Vercel passes the original path through untouched, so
 * req.url arrives as /api/auth/login and the existing /api/* prefixes in
 * app.ts match with no rewriting.
 */

/**
 * Module scope, so a warm container reuses one app. Building per request would
 * re-register every plugin and open a new DB connection on each invocation.
 * A promise (not an awaited value) so concurrent first requests share one build
 * instead of racing to create two.
 */
let appPromise: ReturnType<typeof buildApp> | undefined

async function getApp() {
  if (!appPromise) {
    appPromise = buildApp()
    // A failed build must not be cached, or the container serves the same error
    // until it's recycled. Clear it and let the next request try again.
    appPromise.catch(() => {
      appPromise = undefined
    })
  }
  const app = await appPromise
  await app.ready()
  return app
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp()
  // Hand the raw Node req/res to Fastify's own server. Works because buildApp()
  // is separate from listen() — nothing here binds a port.
  app.server.emit('request', req, res)
}
