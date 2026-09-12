import { mkdir } from 'node:fs/promises'
import Fastify, { type FastifyError, type FastifyReply, type FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { ZodError } from 'zod'
import { prisma } from '@skillflex/db'
import { env, isProd, isServerless } from './lib/env.js'
import { HttpError } from './lib/auth.js'
import { asDatabaseError } from './lib/db-errors.js'
import { storageRoot } from './lib/media.js'
import { authRoutes } from './modules/auth/routes.js'
import { mentorshipRoutes } from './modules/mentorship/routes.js'
import { curriculumRoutes } from './modules/curriculum/routes.js'
import { submissionRoutes } from './modules/submissions/routes.js'
import { feedbackRoutes } from './modules/feedback/routes.js'
import { mediaRoutes } from './modules/media/routes.js'
import { planRoutes } from './modules/plans/routes.js'
import { practiceRoutes } from './modules/practice/routes.js'
import { progressRoutes } from './modules/progress/routes.js'
import { battleRoutes } from './modules/battles/routes.js'
import { supportRoutes } from './modules/support/routes.js'
import { orgRoutes } from './modules/orgs/routes.js'
import { consentRoutes } from './modules/consent/routes.js'
import { liveRoutes } from './modules/live/routes.js'
import { internalRoutes } from './modules/internal/routes.js'

export async function buildApp() {
  const app = Fastify({
    logger: isProd
      ? { level: 'info' }
      : { level: 'info', transport: undefined },
    bodyLimit: 1_048_576, // 1 MB for JSON; video goes through multipart
  })

  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  })

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  })

  await app.register(multipart, {
    limits: {
      // A 2-minute phone recording is ~20 MB; a 45-minute lecture recording is
      // the reason this is not 200 MB. Only local dev posts bytes through here
      // at all — signed-upload providers never touch this limit.
      fileSize: 2 * 1024 * 1024 * 1024, // 2 GB
      files: 1,
    },
  })

  // Dev-only: serve recorded video off disk so the local provider has a
  // playback URL. In production the CDN does this and this plugin is dead code.
  //
  // The isServerless guard is load-bearing, not defensive: Vercel's filesystem
  // is read-only, so mkdir() throws here and takes the entire API down at cold
  // start — every route, not just media.
  if (env.MEDIA_PROVIDER === 'local' && !isServerless) {
    await mkdir(storageRoot, { recursive: true })
    await app.register(fastifyStatic, {
      root: storageRoot,
      prefix: '/media/',
      decorateReply: false,
    })
  }

  /**
   * One error shape for the whole API. The client can rely on
   * { error: { message, code } } and nothing else.
   *
   * The <FastifyError> generic is required: Fastify 5 types the handler's error
   * as `unknown` by default, so statusCode/code are otherwise unreachable.
   */
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: {
          message: 'Some fields need fixing',
          code: 'VALIDATION_ERROR',
          fields: error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
      })
    }

    if (error instanceof HttpError) {
      return reply.code(error.statusCode).send({
        error: { message: error.message, ...(error.code ? { code: error.code } : {}) },
      })
    }

    const status = error.statusCode ?? 500

    /**
     * A database that is busy, asleep, or misconfigured is not a bug in this
     * code, and answering it with the generic 500 below throws away the only
     * clue anyone gets. Checked before the 500 branch because Prisma errors
     * arrive with no statusCode and would otherwise land there.
     */
    const dbError = asDatabaseError(error)
    if (dbError) {
      request.log.error({ err: error }, 'database error')
      if (dbError.statusCode === 503) {
        // Tells fetch-based clients and Vercel's edge that this is worth
        // retrying, and roughly when.
        reply.header('retry-after', '3')
      }
      return reply.code(dbError.statusCode).send({
        error: { message: dbError.message, ...(dbError.code ? { code: dbError.code } : {}) },
      })
    }

    if (status >= 500) {
      request.log.error({ err: error }, 'unhandled error')
      return reply.code(500).send({
        error: { message: 'Something broke on our side', code: 'INTERNAL' },
      })
    }

    return reply.code(status).send({
      error: { message: error.message, ...(error.code ? { code: error.code } : {}) },
    })
  })

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: { message: `No route for ${request.method} ${request.url}`, code: 'NOT_FOUND' },
    })
  })

  /**
   * Health lives under /api like everything else. Outside it, the SPA rewrite
   * in vercel.json would hand back index.html instead.
   *
   * It probes Postgres rather than just reporting that the process is up. A
   * health check that answers ok:true while the database is unreachable is worse
   * than no health check: the plan for this deploy treated `curl /api/health` as
   * the confirmation that Postgres was wired correctly, and it could never have
   * shown otherwise.
   */
  const health = async (_request: FastifyRequest, reply: FastifyReply) => {
    let dbError: HttpError | undefined
    try {
      // SELECT 1 rather than a table count: it needs no schema, so it separates
      // "cannot reach Postgres" from "migrations have not run".
      await prisma.$queryRaw`SELECT 1`
    } catch (err) {
      dbError = asDatabaseError(err) ?? new HttpError(503, 'The database did not answer', 'DB_UNAVAILABLE')
    }

    if (dbError) reply.code(503)

    return {
      ok: !dbError,
      db: dbError ? 'down' : 'up',
      ...(dbError ? { dbError: dbError.message } : {}),
      mediaProvider: env.MEDIA_PROVIDER,
      env: env.NODE_ENV,
      serverless: isServerless,
    }
  }

  app.get('/api/health', health)
  // Kept for local tooling and anything already pointing at the old path.
  app.get('/health', health)

  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(curriculumRoutes, { prefix: '/api/curriculum' })
  await app.register(submissionRoutes, { prefix: '/api/submissions' })
  await app.register(feedbackRoutes, { prefix: '/api/feedback' })
  await app.register(mentorshipRoutes, { prefix: '/api/mentorship' })
  await app.register(mediaRoutes, { prefix: '/api/media' })
  await app.register(planRoutes, { prefix: '/api/plans' })
  await app.register(practiceRoutes, { prefix: '/api/practice' })
  await app.register(progressRoutes, { prefix: '/api/progress' })
  await app.register(battleRoutes, { prefix: '/api/battles' })
  await app.register(supportRoutes, { prefix: '/api/support' })
  await app.register(orgRoutes, { prefix: '/api/orgs' })
  await app.register(consentRoutes, { prefix: '/api/consent' })
  await app.register(liveRoutes, { prefix: '/api/live' })
  await app.register(internalRoutes, { prefix: '/api/internal' })

  return app
}
