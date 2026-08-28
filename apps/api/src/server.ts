import { prisma } from '@skillflex/db'
import { buildApp } from './app.js'
import { env } from './lib/env.js'
import { startRetentionJob } from './jobs/retention.js'

const app = await buildApp()

startRetentionJob(app.log)

/** Close the DB pool on shutdown so nodemon/tsx restarts don't leak handles. */
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void (async () => {
      app.log.info(`${signal} received, shutting down`)
      await app.close()
      await prisma.$disconnect()
      process.exit(0)
    })()
  })
}

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' })
  app.log.info(`SkillFlex API on http://localhost:${env.PORT}  (media: ${env.MEDIA_PROVIDER})`)
} catch (err) {
  app.log.error({ err }, 'failed to start')
  process.exit(1)
}
