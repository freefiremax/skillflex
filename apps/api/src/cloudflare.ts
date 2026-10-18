import { buildApp } from './app.js'
import { loadEnv } from './lib/env.js'
import { purgeExpiredMedia } from './jobs/retention.js'

export interface CloudflareEnv {
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>
  }
  [key: string]: unknown
}

let appPromise: ReturnType<typeof buildApp> | undefined

async function getApp(cfEnv?: Record<string, unknown>) {
  if (cfEnv) {
    process.env.CLOUDFLARE = 'true'
    loadEnv(cfEnv)
  }
  if (!appPromise) {
    appPromise = buildApp()
    appPromise.catch(() => {
      appPromise = undefined
    })
  }
  const app = await appPromise
  await app.ready()
  return app
}

function redact(text: string): string {
  return text
    .replace(/(\/\/[^:/@\s]+):[^@\s]+@/g, '$1:***@')
    .replace(/(sb_secret_|eyJ)[A-Za-z0-9._-]{8,}/g, '$1***')
}

export default {
  async fetch(request: Request, env: CloudflareEnv, _ctx: unknown): Promise<Response> {
    const url = new URL(request.url)

    // Route non-API requests to static assets if available (e.g. Cloudflare Worker with Assets or Pages)
    if (!url.pathname.startsWith('/api') && env.ASSETS) {
      return env.ASSETS.fetch(request)
    }

    try {
      const app = await getApp(env)

      const headers: Record<string, string> = {}
      request.headers.forEach((value, key) => {
        headers[key] = value
      })

      let payload: Buffer | undefined
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        const buffer = await request.arrayBuffer()
        if (buffer.byteLength > 0) {
          payload = Buffer.from(buffer)
        }
      }

      const res = await app.inject({
        method: request.method as any,
        url: url.pathname + url.search,
        headers,
        payload,
      })

      const responseHeaders = new Headers()
      for (const [key, value] of Object.entries(res.headers)) {
        if (Array.isArray(value)) {
          for (const v of value) responseHeaders.append(key, v)
        } else if (value !== undefined) {
          responseHeaders.set(key, String(value))
        }
      }

      return new Response(res.rawPayload, {
        status: res.statusCode,
        headers: responseHeaders,
      })
    } catch (err: any) {
      console.error('[cloudflare] API error:', err)
      const name = err && err.name ? err.name : 'Error'
      const message = err && err.message ? String(err.message) : String(err)

      return new Response(
        JSON.stringify({
          error: {
            code: 'BOOT_FAILED',
            message: redact(`${name}: ${message}`).slice(0, 600),
          },
        }),
        {
          status: 500,
          headers: { 'content-type': 'application/json' },
        },
      )
    }
  },

  async scheduled(_event: unknown, env: CloudflareEnv, _ctx: unknown): Promise<void> {
    console.log('[cloudflare] Running scheduled retention sweep...')
    try {
      const app = await getApp(env)
      const purged = await purgeExpiredMedia(app.log)
      console.log(`[cloudflare] Retention sweep purged ${purged} expired assets.`)
    } catch (err) {
      console.error('[cloudflare] Retention sweep failed:', err)
    }
  },
}
