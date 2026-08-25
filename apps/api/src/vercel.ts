import type { IncomingMessage, ServerResponse } from 'node:http'
import { buildApp } from './app.js'

/**
 * Vercel serverless entrypoint for the whole API.
 *
 * One catch-all function rather than a function per route: ten Fastify plugins
 * and a Prisma client is a lot to pay per cold start, and paying it ten times
 * over would be worse.
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

/**
 * Undo the vercel.json rewrite so Fastify sees the path the client asked for.
 *
 * A single file cannot be routed to by name for every depth of /api/* — Vercel
 * only honours the `[...catchall]` filename convention for framework presets,
 * and this project sets `framework: null`, so `api/[...path].mjs` matched exactly
 * one segment: /api/health worked and /api/auth/login 404'd before reaching us.
 * The fix is an explicit rewrite of /api/(.*) to this function, carrying the real
 * path in `__path`.
 *
 * Written to be correct whether or not Vercel preserves the original req.url
 * across that rewrite — the query parameter is the source of truth either way,
 * and undocumented behaviour is not something to hang every route on.
 */
function restorePath(rawUrl: string): string {
  const queryStart = rawUrl.indexOf('?')
  if (queryStart === -1) return rawUrl

  const params = new URLSearchParams(rawUrl.slice(queryStart + 1))
  const original = params.get('__path')
  if (original === null) return rawUrl

  // Everything else was the caller's own query string; hand it back untouched.
  params.delete('__path')
  const rest = params.toString()
  return `/api/${original}${rest ? `?${rest}` : ''}`
}

/**
 * Config errors name a variable, never its value, so echoing them is safe and
 * saves a trip through the Vercel log viewer. Anything else could be a stack
 * trace or a connection string, and stays generic.
 */
function isConfigError(err: unknown): err is Error {
  return err instanceof Error && err.message.startsWith('Invalid environment configuration')
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  let app
  try {
    app = await getApp()
  } catch (err) {
    // Without this the whole thing surfaces as FUNCTION_INVOCATION_FAILED with
    // the reason buried in the runtime logs.
    console.error('[boot] API failed to start', err)
    res.statusCode = 500
    res.setHeader('content-type', 'application/json')
    res.end(
      JSON.stringify({
        error: {
          code: 'BOOT_FAILED',
          message: isConfigError(err)
            ? err.message
            : 'The API failed to start. Check the Vercel runtime logs.',
        },
      }),
    )
    return
  }

  req.url = restorePath(req.url ?? '/')
  // Hand the raw Node req/res to Fastify's own server. Works because buildApp()
  // is separate from listen() — nothing here binds a port.
  app.server.emit('request', req, res)
}
