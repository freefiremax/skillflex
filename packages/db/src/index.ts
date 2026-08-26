import { PrismaClient } from '@prisma/client'

export * from '@prisma/client'

/**
 * A connect-time failure means the query never reached Postgres.
 *
 * That is the entire safety argument for the retry below, and it is why this
 * checks the error's class rather than its code: a `PrismaClientInitializationError`
 * is thrown before any statement is sent, so nothing can have half-happened and
 * replaying the operation cannot double-write. A code-based check would not carry
 * that guarantee — P1017 ("server closed the connection") arrives as an
 * initialization error at connect time and as a request error mid-statement, and
 * retrying the second kind on a POST could duplicate a write.
 */
export function isConnectFailure(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  // Structural, not `instanceof`: the API bundle leaves @prisma/client external,
  // and shape-matching survives a second copy of the module either way.
  return (err as { name?: unknown }).name === 'PrismaClientInitializationError'
}

/** Codes a retry cannot fix: wrong credentials, missing database, stale schema. */
const PERMANENT = new Set(['P1000', 'P1003', 'P1012'])

function isRetriable(err: unknown): boolean {
  if (!isConnectFailure(err)) return false
  const code = (err as { errorCode?: unknown }).errorCode
  return typeof code !== 'string' || !PERMANENT.has(code)
}

/**
 * Small and bounded on purpose. Vercel's Hobby plan kills a function at 10s, so
 * the retry budget has to leave room for the request that follows it; ~1s of
 * backoff buys the pooler enough time to recover from a burst without eating the
 * whole invocation.
 */
const BACKOFF_MS = [200, 700]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  }).$extends({
    query: {
      /**
       * Retry operations that never made it to the database.
       *
       * Serverless makes this necessary rather than nice: every cold container
       * opens its own pooled connection, so a burst of simultaneous cold starts
       * asks Supabase for N connections at once and the pooler simply refuses
       * the overflow. Measured on the live deploy, 2 of 14 concurrent logins
       * failed that way — a 14% error rate for the one action a demo audience
       * all performs at the same moment.
       *
       * Jittered so retried containers spread out instead of colliding again on
       * the same schedule, which is how a thundering herd survives its own
       * retry.
       */
      async $allOperations({ args, query }) {
        for (let attempt = 0; ; attempt += 1) {
          try {
            return await query(args)
          } catch (err) {
            if (attempt >= BACKOFF_MS.length || !isRetriable(err)) throw err
            await sleep(BACKOFF_MS[attempt]! + Math.floor(Math.random() * 150))
          }
        }
      },
    },
  })
}

type Client = ReturnType<typeof createClient>

const globalForPrisma = globalThis as unknown as { prisma?: Client }

// Cached in every environment, not just dev. In dev this survives tsx watch
// reloads; on Vercel it survives warm invocations of the same container, which
// is the difference between reusing one pooled connection and opening a new one
// on every request.
export const prisma: Client = globalForPrisma.prisma ?? createClient()
globalForPrisma.prisma = prisma

/**
 * Open the connection before the first request needs it, retrying a refusal.
 *
 * The per-operation retry above cannot cover `$transaction()` — a client
 * extension sees the operations inside a transaction, not the BEGIN that opens
 * it — and four of the most important writes in the product are interactive
 * transactions (register, feedback, mentor switch, org create). Establishing the
 * connection during container warmup protects them too, because by the time a
 * route runs there is already a live connection to reuse.
 *
 * Never throws: a database that is down should produce a 503 naming the database
 * on each request, not a container that refuses to boot and reports the far more
 * confusing BOOT_FAILED.
 */
export async function connectWithRetry(): Promise<Error | undefined> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await prisma.$connect()
      return undefined
    } catch (err) {
      if (attempt >= BACKOFF_MS.length || !isRetriable(err)) return err as Error
      await sleep(BACKOFF_MS[attempt]! + Math.floor(Math.random() * 150))
    }
  }
}

// Prisma scalar lists (String[]) are Postgres-only, so list-ish columns are Json.
// These helpers keep the parse-or-cast in one place instead of scattered across
// modules, and accept both an already-parsed value and a raw JSON string — which
// is what makes the call sites survive the move to Postgres.
export function readList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
    } catch {
      return []
    }
  }
  return []
}

export function readRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

/**
 * Json columns holding arrays of objects (rubric criteria, weekly plan items).
 * readList() deliberately drops non-strings, so it can't be reused here.
 */
export function readObjectList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as T[]) : []
    } catch {
      return []
    }
  }
  return []
}
