/**
 * The single serverless function behind every /api/* request.
 *
 * Named plainly, not `[...path].mjs`: Vercel only honours the `[...catchall]`
 * filename convention for framework presets, and this project sets
 * `framework: null`. As `[...path].mjs` it silently matched one segment only —
 * /api/health reached it, /api/auth/login got a platform 404. Routing is now an
 * explicit `rewrites` entry in vercel.json instead of a filename convention.
 *
 * The real handler is bundled from TypeScript into apps/api/dist/vercel.mjs
 * during the build (see `build:api` in the root package.json). Bundling first is
 * not optional — @skillswitch/db and @skillswitch/shared are consumed as raw
 * TypeScript, and Vercel's Node builder will not compile TypeScript it finds
 * inside node_modules.
 *
 * Both files are .mjs on purpose. The bundle is ESM, and a .js extension would
 * leave Node to infer that from the nearest package.json — which the function
 * bundle does not necessarily contain, since includeFiles ships apps/api/dist
 * and not apps/api/package.json. Node would then fall back to the root
 * package.json, which has no `type`, read the bundle as CommonJS, and throw on
 * the first import.
 *
 * The import is dynamic rather than a static re-export so that a failure inside
 * the bundle's module scope is catchable. That scope does real work — env
 * validation, media provider construction, `new PrismaClient()` — and any throw
 * there happens before a static handler reference could exist, which Vercel
 * reports as a bare FUNCTION_INVOCATION_FAILED with the reason visible only in
 * the runtime log viewer. One misconfigured variable should not cost a trip
 * through the dashboard to identify.
 */

/** Module scope: a warm container loads the bundle once. */
let handlerPromise

function load() {
  if (!handlerPromise) {
    handlerPromise = import('../apps/api/dist/vercel.mjs').then((mod) => mod.default)
    // A failed load must not be cached, or the container keeps serving the same
    // error until it is recycled.
    handlerPromise.catch(() => {
      handlerPromise = undefined
    })
  }
  return handlerPromise
}

/**
 * Errors can carry a DATABASE_URL — Prisma quotes it back on a connection
 * failure. Strip inline credentials before anything reaches a response body.
 */
function redact(text) {
  return text
    .replace(/(\/\/[^:/@\s]+):[^@\s]+@/g, '$1:***@')
    .replace(/(sb_secret_|eyJ)[A-Za-z0-9._-]{8,}/g, '$1***')
}

export default async function handler(req, res) {
  try {
    const inner = await load()
    return await inner(req, res)
  } catch (err) {
    // Always log the unredacted original; only the response gets scrubbed.
    console.error('[boot] API failed to load', err)

    const name = err && err.name ? err.name : 'Error'
    const message = err && err.message ? String(err.message) : String(err)

    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('content-type', 'application/json')
      res.end(
        JSON.stringify({
          error: {
            code: 'BOOT_FAILED',
            message: redact(`${name}: ${message}`).slice(0, 600),
          },
        }),
      )
    }
  }
}
