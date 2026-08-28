import type { FastifyInstance } from 'fastify'
import { prisma } from '@skillflex/db'
import { z } from 'zod'
import { MEDIA_KINDS, SUBMISSION_RETENTION_DAYS } from '@skillflex/shared'
import { badRequest, currentUser, forbidden, notFound, requireAuth } from '../../lib/auth.js'
import { mediaProvider } from '../../lib/media.js'

const createMediaSchema = z.object({
  kind: z.enum(MEDIA_KINDS).default('submission_video'),
  durationSeconds: z.number().int().min(1).max(3600).optional(),
  /**
   * What MediaRecorder produced. Providers that store to object storage need it
   * to pick a file extension at reserve time, before any bytes exist.
   */
  contentType: z.string().max(120).optional(),
})

const completeMediaSchema = z.object({
  sizeBytes: z.number().int().positive().optional(),
  durationSeconds: z.number().int().min(1).max(3600).optional(),
})

/** A signed link must never outlive the video it points at. */
const MAX_PLAYBACK_TTL_SECONDS = 365 * 24 * 60 * 60

function playbackTtlSeconds(retentionUntil: Date | null): number {
  if (!retentionUntil) return MAX_PLAYBACK_TTL_SECONDS
  const remaining = Math.floor((retentionUntil.getTime() - Date.now()) / 1000)
  return Math.min(MAX_PLAYBACK_TTL_SECONDS, Math.max(60, remaining))
}

/**
 * A playable URL for an asset: signed when the provider keeps objects private
 * (Supabase), plain otherwise (local dev).
 */
async function resolvePlaybackUrl(externalId: string, retentionUntil: Date | null): Promise<string> {
  return mediaProvider.signedPlaybackUrl
    ? mediaProvider.signedPlaybackUrl(externalId, playbackTtlSeconds(retentionUntil))
    : mediaProvider.playbackUrlFor(externalId)
}

/**
 * Media lifecycle: reserve -> upload -> mark ready.
 *
 * In production the browser never posts bytes here — it gets a signed ticket
 * and PUTs straight to the storage provider, then calls /:id/complete. The
 * direct upload route below exists only because the local dev provider has
 * nowhere else to put the file.
 */
export async function mediaRoutes(app: FastifyInstance) {
  /** Step 1: reserve a MediaAsset row and get somewhere to upload to. */
  app.post('/', { preHandler: requireAuth }, async (request, reply) => {
    const user = currentUser(request)
    const body = createMediaSchema.parse(request.body ?? {})

    // DPDP: the retention deadline is set at creation, not "later, when we get
    // around to it". Student video is the sensitive asset in this product.
    const retentionUntil =
      body.kind === 'submission_video'
        ? new Date(Date.now() + SUBMISSION_RETENTION_DAYS * 24 * 60 * 60 * 1000)
        : null

    const media = await prisma.mediaAsset.create({
      data: {
        provider: mediaProvider.name,
        kind: body.kind,
        status: 'pending',
        ownerUserId: user.sub,
        durationSeconds: body.durationSeconds ?? null,
        retentionUntil,
      },
    })

    const ticket = await mediaProvider.createUploadTicket({
      mediaId: media.id,
      kind: body.kind,
      contentType: body.contentType,
    })
    await prisma.mediaAsset.update({
      where: { id: media.id },
      data: { externalId: ticket.externalId },
    })

    return reply.code(201).send({
      mediaId: media.id,
      uploadUrl: ticket.uploadUrl,
      headers: ticket.headers ?? {},
      provider: mediaProvider.name,
    })
  })

  /**
   * Step 2 (local dev only): accept the bytes.
   * Streamed to disk — the file is never buffered in memory.
   */
  app.post('/:id/upload', { preHandler: requireAuth }, async (request, reply) => {
    const user = currentUser(request)
    const { id } = request.params as { id: string }

    if (!mediaProvider.acceptDirectUpload) {
      throw badRequest(
        'This provider does not accept direct uploads — use the signed upload URL',
        'DIRECT_UPLOAD_UNSUPPORTED',
      )
    }

    const media = await prisma.mediaAsset.findUnique({ where: { id } })
    if (!media) throw notFound('Media not found')
    if (media.ownerUserId !== user.sub) throw forbidden('Not your upload')
    if (media.status === 'ready') throw badRequest('Already uploaded', 'ALREADY_UPLOADED')

    const file = await request.file()
    if (!file) throw badRequest('No file in request', 'NO_FILE')

    await prisma.mediaAsset.update({ where: { id }, data: { status: 'pending' } })

    try {
      const stored = await mediaProvider.acceptDirectUpload({
        mediaId: id,
        filename: file.filename ?? 'recording.webm',
        stream: file.file,
      })

      const updated = await prisma.mediaAsset.update({
        where: { id },
        data: {
          status: 'ready',
          externalId: stored.externalId,
          localPath: stored.localPath ?? null,
          playbackUrl: stored.playbackUrl,
          sizeBytes: stored.sizeBytes ?? null,
        },
      })

      return reply.send({
        ok: true,
        mediaId: updated.id,
        status: updated.status,
        playbackUrl: updated.playbackUrl,
      })
    } catch (err) {
      await prisma.mediaAsset.update({ where: { id }, data: { status: 'failed' } })
      throw err
    }
  })

  /**
   * Step 3 (signed-upload providers): the client tells us the bytes landed.
   *
   * Supabase Storage does not call webhooks on upload, so /webhook below can't
   * serve this — and unlike /webhook this route is authenticated and owner-
   * scoped, so only the student who reserved the asset can mark it ready.
   */
  app.post('/:id/complete', { preHandler: requireAuth }, async (request, reply) => {
    const user = currentUser(request)
    const { id } = request.params as { id: string }
    const body = completeMediaSchema.parse(request.body ?? {})

    const media = await prisma.mediaAsset.findUnique({ where: { id } })
    if (!media || media.deletedAt) throw notFound('Media not found')
    if (media.ownerUserId !== user.sub) throw forbidden('Not your upload')
    if (!media.externalId) throw badRequest('This asset has no upload ticket', 'NO_TICKET')

    const playbackUrl = await resolvePlaybackUrl(media.externalId, media.retentionUntil)

    const updated = await prisma.mediaAsset.update({
      where: { id },
      data: {
        status: 'ready',
        playbackUrl,
        ...(body.sizeBytes ? { sizeBytes: body.sizeBytes } : {}),
        ...(body.durationSeconds ? { durationSeconds: body.durationSeconds } : {}),
      },
    })

    return reply.send({
      ok: true,
      mediaId: updated.id,
      status: updated.status,
      playbackUrl: updated.playbackUrl,
    })
  })

  /** Poll target for the client while an upload settles. */
  app.get('/:id', { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string }
    const media = await prisma.mediaAsset.findUnique({ where: { id } })
    if (!media || media.deletedAt) throw notFound('Media not found')

    return {
      id: media.id,
      status: media.status,
      kind: media.kind,
      playbackUrl: media.playbackUrl,
      durationSeconds: media.durationSeconds,
      retentionUntil: media.retentionUntil,
    }
  })

  /**
   * Provider webhook. Unauthenticated by design (the provider has no JWT) —
   * production must verify a signature header here before trusting anything.
   */
  app.post('/webhook', async (request, reply) => {
    const body = (request.body ?? {}) as {
      externalId?: string
      status?: string
      playbackUrl?: string
      durationSeconds?: number
      sizeBytes?: number
    }
    if (!body.externalId) throw badRequest('externalId required')

    const media = await prisma.mediaAsset.findFirst({ where: { externalId: body.externalId } })
    if (!media) throw notFound('Unknown asset')

    const playbackUrl =
      body.playbackUrl ?? (await resolvePlaybackUrl(body.externalId, media.retentionUntil))

    await prisma.mediaAsset.update({
      where: { id: media.id },
      data: {
        status: body.status === 'failed' ? 'failed' : 'ready',
        playbackUrl,
        ...(body.durationSeconds ? { durationSeconds: body.durationSeconds } : {}),
        ...(body.sizeBytes ? { sizeBytes: body.sizeBytes } : {}),
      },
    })

    return reply.send({ ok: true })
  })
}
