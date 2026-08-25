import { unlink } from 'node:fs/promises'
import { prisma } from '@skillswitch/db'
import type { FastifyBaseLogger } from 'fastify'
import { mediaProvider } from '../lib/media.js'

/**
 * Retention purge.
 *
 * Every submission video gets a retentionUntil at creation; this job hard-
 * deletes the bytes once that date passes and marks the row deleted. The row
 * survives so feedback history and accreditation aggregates stay intact — it is
 * the video that goes, which is the part that's actually sensitive.
 *
 * Two triggers, same function: an in-process interval when the API runs as a
 * long-lived server (startRetentionJob below), and a Vercel Cron hitting
 * /api/internal/retention when it runs as serverless functions, where nothing
 * lives long enough to hold a timer.
 */
export async function purgeExpiredMedia(log: FastifyBaseLogger): Promise<number> {
  const due = await prisma.mediaAsset.findMany({
    where: {
      deletedAt: null,
      retentionUntil: { not: null, lte: new Date() },
    },
    take: 200,
  })

  let purged = 0
  for (const asset of due) {
    try {
      if (asset.localPath) {
        await unlink(asset.localPath).catch((err: NodeJS.ErrnoException) => {
          // Already gone is a success, not a failure.
          if (err.code !== 'ENOENT') throw err
        })
      }
      // Object-storage providers delete by key instead. Same rule applies: an
      // object that isn't there any more is the outcome we wanted.
      if (asset.externalId && mediaProvider.deleteObject) {
        await mediaProvider.deleteObject(asset.externalId)
      }

      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { deletedAt: new Date(), status: 'deleted', localPath: null, playbackUrl: null },
      })
      purged += 1
    } catch (err) {
      log.error({ err, mediaId: asset.id }, 'retention purge failed for asset')
    }
  }

  if (purged > 0) log.info({ purged }, 'retention purge complete')
  return purged
}

const ONE_HOUR = 60 * 60 * 1000

export function startRetentionJob(log: FastifyBaseLogger): NodeJS.Timeout {
  // Run once shortly after boot, then hourly.
  setTimeout(() => {
    void purgeExpiredMedia(log).catch((err) => log.error({ err }, 'retention job crashed'))
  }, 10_000)

  const timer = setInterval(() => {
    void purgeExpiredMedia(log).catch((err) => log.error({ err }, 'retention job crashed'))
  }, ONE_HOUR)

  timer.unref()
  return timer
}
