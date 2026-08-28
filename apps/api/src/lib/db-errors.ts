import { isConnectFailure } from '@skillflex/db'
import { HttpError } from './auth.js'

/**
 * Database failures are configuration and capacity problems, not bugs — so the
 * generic 500 is the worst possible answer to them. "Something broke on our
 * side" sent a burst of failed logins into a black hole: 2 of 14 concurrent
 * requests failed and the response said nothing about which layer, which meant
 * the only way to find out was the Vercel log viewer.
 *
 * This maps them to a status and a message that names the layer and the likely
 * cause, exactly as lib/media.ts does for Storage.
 */

/**
 * Errors can carry a DATABASE_URL — Prisma quotes the connection string back on
 * a connection failure, and it has the password inline.
 *
 * Deliberately duplicated from api/server.mjs rather than shared: that file is
 * the fallback for when this bundle fails to load at all, so it must not import
 * from it.
 */
function redact(text: string): string {
  return text
    .replace(/(\/\/[^:/@\s]+):[^@\s]+@/g, '$1:***@')
    .replace(/(sb_secret_|eyJ)[A-Za-z0-9._-]{8,}/g, '$1***')
}

/** Structural, not `instanceof`: esbuild leaves @prisma/client external, and
 *  matching on shape survives a second copy of the module either way. */
interface PrismaLikeError {
  name?: unknown
  code?: unknown
  errorCode?: unknown
  message?: unknown
}

function prismaCode(err: PrismaLikeError): string | undefined {
  // Known request errors carry `code`; initialization errors carry `errorCode`.
  const raw = typeof err.code === 'string' ? err.code : err.errorCode
  return typeof raw === 'string' && /^P\d{4}$/.test(raw) ? raw : undefined
}

/**
 * A connect-time failure means the query never reached Postgres, so no write
 * can have half-happened. `isConnectFailure` is imported from @skillflex/db
 * rather than redefined here because the retry in that package keys off the
 * same predicate, and a divergence between the two would mean either retrying
 * something unsafe or reporting a retriable failure as permanent.
 */

/** Codes no retry can fix — the deploy is misconfigured, not busy. */
const PERMANENT: Record<string, string> = {
  P1000: 'DATABASE_URL has the wrong username or password',
  P1003: 'the database named in DATABASE_URL does not exist',
  P1012: 'the Prisma schema and DATABASE_URL disagree — run prisma db push',
}

/** Codes that mean busy or asleep rather than broken. */
const TRANSIENT: Record<string, string> = {
  P1001:
    'Postgres is not accepting connections — usually the Supabase pooler refusing a burst, or a paused free-tier project',
  P1002: 'Postgres accepted the connection then timed out',
  P1008: 'the query took longer than the timeout allows',
  P1017: 'Postgres closed the connection mid-request',
  P2024:
    'no free connection in the pool — DATABASE_URL uses connection_limit=1 per container, which is correct for session-mode pooling but leaves no slack under a burst',
}

/**
 * Pull the one useful sentence out of a Prisma error message.
 *
 * The message is a formatted report, not a sentence — a banner, the source file
 * and line, a code frame with an arrow, then the actual reason, then advice:
 *
 *     Invalid `prisma.user.findUnique()` invocation in
 *     /var/task/apps/api/src/modules/auth/routes.ts:102:36
 *
 *       100 const user = await prisma.user.findUnique(
 *     → 102   where: { email }
 *     Can't reach database server at `db.example.com:5432`
 *
 * Taking the first lines therefore returns the banner and a filesystem path —
 * which discloses the deploy's directory layout and omits the only line anyone
 * needed. So drop the frame and the path, keep the reason, and keep the operation
 * name separately because knowing which query died is genuinely useful.
 */
function reasonFrom(message: string): string {
  const lines = redact(message)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const operation = /Invalid `([^`]+)` invocation/.exec(message)?.[1]

  const reason = lines.filter((line) => {
    if (line.startsWith('Invalid `')) return false
    // Code frame: "→ 102 where: { email }", "100 const user = ...", or a bare
    // gutter number like "99" once the code after it trims to nothing. The
    // trailing (\s|$) is load-bearing: without it a lone line number survives.
    if (/^(→\s*)?\d+(\s|$)/.test(line)) return false
    // A bare source location, absolute or Windows-style, with line:col.
    if (/^(→\s*)?([a-zA-Z]:[\\/]|[\\/])\S*:\d+:\d+$/.test(line)) return false
    // Prisma's closing advice repeats the reason as an imperative.
    if (line.startsWith('Please make sure')) return false
    return true
  })

  return [operation ? `${operation}:` : '', reason.join(' ')]
    .filter(Boolean)
    .join(' ')
    .slice(0, 240)
}

export function asDatabaseError(err: unknown): HttpError | undefined {
  if (!err || typeof err !== 'object') return undefined
  const e = err as PrismaLikeError
  const name = typeof e.name === 'string' ? e.name : ''
  const code = prismaCode(e)

  const isPrisma =
    name.startsWith('PrismaClient') || (code !== undefined && (code in PERMANENT || code in TRANSIENT))
  if (!isPrisma) return undefined

  const detail = reasonFrom(typeof e.message === 'string' ? e.message : '')

  if (code && code in PERMANENT) {
    return new HttpError(500, `The database is misconfigured: ${PERMANENT[code]}. ${detail}`, 'DB_MISCONFIGURED')
  }

  /**
   * `PrismaClientUnknownRequestError` is what the engine throws when the pooler
   * drops or refuses a connection mid-flight and no P-code is attached — the
   * residual blind 500s in the concurrent-login burst were exactly this. It is
   * not a query bug: a bug in a query surfaces as a *Known*RequestError with a
   * P2xxx code, which is handled by the branch below or, when it is a genuine
   * constraint violation, left to the generic handler. So treat the Unknown
   * class as transient too.
   */
  const transientByClass = isConnectFailure(err) || name === 'PrismaClientUnknownRequestError'

  if ((code && code in TRANSIENT) || transientByClass) {
    /**
     * Measured on Prisma 6.19.3: a connect failure populates neither `errorCode`
     * nor `retryable` — both properties exist on the error and are left
     * undefined, for a refused connection and an unresolvable host alike. So the
     * class name is the only signal, and the uncoded case is the common one
     * rather than an edge case. It is P1001 in everything but the tag, so it
     * gets P1001's hint.
     */
    const hint = (code && TRANSIENT[code]) ?? TRANSIENT.P1001
    return new HttpError(
      503,
      `The database is temporarily unavailable — please try again in a few seconds. (${code ?? 'connect failed'}: ${hint}.) ${detail}`,
      'DB_UNAVAILABLE',
    )
  }

  // A coded PrismaClientKnownRequestError that is none of the above is a real
  // bug in a query — a unique-constraint violation, a bad include. Let the
  // generic handler own it, because the message can quote row data.
  return undefined
}
