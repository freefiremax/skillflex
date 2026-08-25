import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { z } from 'zod'

/**
 * One .env at the repo root, shared by api + web + prisma. `dotenv/config` reads
 * from process.cwd(), which would be apps/api here — so find the root ourselves.
 *
 * Walk up looking for the file rather than counting directories: this module is
 * loaded from src/lib/ under tsx and from dist/ once esbuild has bundled it for
 * Vercel, and those are different depths. A hardcoded ../../../../ silently
 * resolves to the wrong directory in one of the two, and dotenv does not
 * complain about a path that isn't there.
 */
function findEnvFile(): string | undefined {
  let dir = path.dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 8; i += 1) {
    const candidate = path.join(dir, '.env')
    if (existsSync(candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return undefined
}

// On Vercel the platform injects env vars directly and there is no .env to find.
if (!process.env.VERCEL) {
  const envFile = findEnvFile()
  if (envFile) dotenv.config({ path: envFile })
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  MEDIA_PROVIDER: z.enum(['local', 'supabase', 'bunny', 'cloudflare']).default('local'),
  STORAGE_DIR: z.string().default('../../storage'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Supabase Storage — required only when MEDIA_PROVIDER=supabase, enforced below.
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('submissions'),

  /** Shared secret for the retention cron. Vercel Cron sends it as a Bearer token. */
  CRON_SECRET: z.string().min(16).optional(),
})

const parsed = envSchema
  .superRefine((value, ctx) => {
    // Fail at boot rather than on the first upload, which is where a missing
    // key would otherwise surface — long after the deploy looked healthy.
    if (value.MEDIA_PROVIDER !== 'supabase') return
    for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const) {
      if (!value[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when MEDIA_PROVIDER=supabase`,
        })
      }
    }
  })
  .safeParse(process.env)

if (!parsed.success) {
  const detail = parsed.error.issues
    .map((issue) => `   - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n')
  // Throw, don't process.exit(1): on Vercel the exit code is swallowed and all
  // you get is an opaque FUNCTION_INVOCATION_FAILED with no reason attached.
  throw new Error(
    `Invalid environment configuration:\n${detail}\n\nCopy .env.example to .env and fill it in.`,
  )
}

export const env = parsed.data
export const isProd = env.NODE_ENV === 'production'

/** True inside a Vercel serverless function: read-only FS, no long-lived timers. */
export const isServerless = Boolean(process.env.VERCEL)
