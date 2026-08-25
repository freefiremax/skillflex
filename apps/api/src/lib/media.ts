import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Readable } from 'node:stream'
import { env } from './env.js'

const here = path.dirname(fileURLToPath(import.meta.url))
export const storageRoot = path.resolve(here, '../../', env.STORAGE_DIR)

export interface UploadTicket {
  /** Where the browser should PUT/POST the bytes. */
  uploadUrl: string
  /** Provider-side id we persist on MediaAsset.externalId. */
  externalId: string
  /** Extra headers/fields the client must send. */
  headers?: Record<string, string>
}

export interface StoredObject {
  externalId: string
  localPath?: string
  playbackUrl: string
  sizeBytes?: number
}

/**
 * Video never streams through the API in production. The browser uploads
 * straight to the provider with a signed ticket, and the provider calls our
 * webhook when the asset is ready. Proxying video through Node is the fastest
 * way to melt a small server and a bandwidth budget at once.
 *
 * The local provider below is a dev stand-in that writes to ./storage so the
 * stack runs with no third-party account. It is the ONLY implementation that
 * accepts bytes through the API, and it is not for production use.
 */
export interface MediaProvider {
  readonly name: string
  createUploadTicket(input: { mediaId: string; kind: string }): Promise<UploadTicket>
  /** Only the local dev provider implements this. */
  acceptDirectUpload?(input: {
    mediaId: string
    filename: string
    stream: Readable
  }): Promise<StoredObject>
  playbackUrlFor(externalId: string): string
}

class LocalMediaProvider implements MediaProvider {
  readonly name = 'local'

  async createUploadTicket({ mediaId }: { mediaId: string; kind: string }): Promise<UploadTicket> {
    return {
      uploadUrl: `/api/media/${mediaId}/upload`,
      externalId: mediaId,
    }
  }

  async acceptDirectUpload({
    mediaId,
    filename,
    stream,
  }: {
    mediaId: string
    filename: string
    stream: Readable
  }): Promise<StoredObject> {
    const safeExt = path.extname(filename).replace(/[^.a-zA-Z0-9]/g, '') || '.webm'
    const dir = path.join(storageRoot, 'submissions')
    await mkdir(dir, { recursive: true })
    const filePath = path.join(dir, `${mediaId}${safeExt}`)
    await pipeline(stream, createWriteStream(filePath))
    return {
      externalId: mediaId,
      localPath: filePath,
      playbackUrl: this.playbackUrlFor(`${mediaId}${safeExt}`),
    }
  }

  playbackUrlFor(externalId: string): string {
    return `/media/submissions/${externalId}`
  }
}

/**
 * Stub for the real thing. Bunny Stream is the cheapest credible option for an
 * India-first, cost-sensitive rollout; Cloudflare Stream is the alternative.
 * Implementing this class is the only change needed to go production — no
 * route or schema changes, which is the point of the interface.
 */
class BunnyMediaProvider implements MediaProvider {
  readonly name = 'bunny'

  async createUploadTicket(): Promise<UploadTicket> {
    throw new Error(
      'BunnyMediaProvider is not implemented yet. Set MEDIA_PROVIDER=local for development.',
    )
  }

  playbackUrlFor(externalId: string): string {
    return `https://vz-example.b-cdn.net/${externalId}/playlist.m3u8`
  }
}

function build(): MediaProvider {
  switch (env.MEDIA_PROVIDER) {
    case 'local':
      return new LocalMediaProvider()
    case 'bunny':
    case 'cloudflare':
      return new BunnyMediaProvider()
    default:
      return new LocalMediaProvider()
  }
}

export const mediaProvider = build()
