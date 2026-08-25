/**
 * Creates .env from .env.example on first run.
 *
 * Every workspace (api via dotenv, prisma via dotenv-cli, vite via its own
 * loader) reads the single .env at the repo root. Missing it is the most common
 * first-run failure, so setup creates it instead of printing advice.
 */
import { copyFile, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const target = path.join(root, '.env')
const source = path.join(root, '.env.example')

try {
  await access(target)
  console.log('  .env already exists — leaving it alone.')
} catch {
  await copyFile(source, target)
  console.log('  Created .env from .env.example')
  console.log('  Dev defaults are fine. Change JWT_SECRET before anything real.')
}
