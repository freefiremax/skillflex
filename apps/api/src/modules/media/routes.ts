import type { FastifyInstance } from 'fastify'
import { prisma } from '@skillswitch/db'
import { z } from 'zod'
import { MEDIA_KINDS, SUBMISSION_RETENTION_DAYS } from '@skillswitch/shared'
import { badRequest, currentUser, forbidden, notFound, requireAuth } from '../../lib/auth.js'
import { mediaProvider } from '../../lib/media.js'

const createMediaSchema = z.object({
  kind: z.enum(MEDIA_KINDS).default('submission_video'),
  durationSeconds: z.number().int().min(1).max(3600).optional(),
})

/**
 * Media lifecycle: reserve -> upload -> mark ready.
 *
 * In production the browser never posts bytes here — it gets a signed ticket
 * and PUTs straight to the CDN provider, which then calls /webhook. The direct
 * upload route below exists only because the local dev provider has nowhere
 * else to put the file.
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

    const ticket = await mediaProvider.createUploadTicket({ mediaId: media.id, kind: body.kind })
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

    await prisma.mediaAsset.update({
      where: { id: media.id },
      data: {
        status: body.status === 'failed' ? 'failed' : 'ready',
        playbackUrl: body.playbackUrl ?? mediaProvider.playbackUrlFor(body.externalId),
        ...(body.durationSeconds ? { durationSeconds: body.durationSeconds } : {}),
        ...(body.sizeBytes ? { sizeBytes: body.sizeBytes } : {}),
      },
    })

    return reply.send({ ok: true })
  })
}
