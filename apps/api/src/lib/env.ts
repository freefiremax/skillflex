import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { z } from 'zod'

// One .env at the repo root, shared by api + web + prisma. `dotenv/config` reads
// from process.cwd(), which would be apps/api here — so resolve the root
// explicitly instead. Works the same from src/ (tsx) and dist/ (node).
const here = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(here, '../../../../.env') })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  MEDIA_PROVIDER: z.enum(['local', 'bunny', 'cloudflare']).default('local'),
  STORAGE_DIR: z.string().default('../../storage'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('\n  Invalid environment configuration:\n')
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`)
  }
  console.error('\n  Copy .env.example to .env and fill it in.\n')
  process.exit(1)
}

export const env = parsed.data
export const isProd = env.NODE_ENV === 'production'
