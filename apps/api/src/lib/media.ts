import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Readable } from 'node:stream'
import { AwsClient } from 'aws4fetch'
import { HttpError } from './auth.js'
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
  createUploadTicket(input: {
    mediaId: string
    kind: string
    /** Lets the provider pick a file extension for the stored object. */
    contentType?: string
  }): Promise<UploadTicket>
  /** Only the local dev provider implements this. */
  acceptDirectUpload?(input: {
    mediaId: string
    filename: string
    stream: Readable
  }): Promise<StoredObject>
  playbackUrlFor(externalId: string): string
  /**
   * Providers whose objects are private mint a time-limited URL instead. Async
   * because signing is a round trip; playbackUrlFor() stays synchronous so the
   * local provider and its 14 existing call sites are unaffected.
   */
  signedPlaybackUrl?(externalId: string, expiresInSeconds: number): Promise<string>
  /**
   * The longest playback link this provider will ever mint, in seconds.
   *
   * This is why playableUrl() exists. SigV4 presigning stops at 7 days; a
   * submission is retained for 365. A URL minted at upload time and stored in
   * MediaAsset.playbackUrl is therefore dead a week later, with no error to say
   * so. Providers that sign must leave playbackUrl null and let callers mint on
   * read. Absent means "no ceiling worth respecting" (local dev).
   */
  maxPlaybackTtlSeconds?: number
  /** Hard-delete the bytes. Used by the retention job. */
  deleteObject?(externalId: string): Promise<void>
}

/** A signature is never allowed to outlive the row's retention deadline. */
const MAX_SIGNED_URL_SECONDS = 365 * 24 * 60 * 60

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

/** video/webm;codecs=vp9 -> webm. Whatever MediaRecorder picked, we store it as-is. */
function extensionFor(contentType: string | undefined): string {
  if (contentType?.includes('mp4')) return 'mp4'
  return 'webm'
}

/**
 * Object key inside the bucket, also persisted as externalId. Keyed by media
 * kind rather than a fixed prefix — lesson video and student video want
 * separating, and the key must not change after the ticket is handed out.
 */
function objectPathFor(mediaId: string, kind: string, contentType?: string): string {
  const folder = kind.replace(/[^a-z0-9_-]/gi, '') || 'other'
  return `${folder}/${mediaId}.${extensionFor(contentType)}`
}

/**
 * A Storage failure that remembers the status Supabase actually reported, so
 * callers can branch on it (retry a missing bucket, ignore a create race)
 * without pattern-matching the human-readable message.
 */
class StorageError extends HttpError {
  constructor(
    readonly storageStatus: number,
    message: string,
    code: string,
  ) {
    super(502, message, code)
  }
}

/**
 * Turn a Storage HTTP failure into something an operator can act on.
 *
 * Every one of these is a deploy-configuration problem, and the generic 500
 * ("Something broke on our side") is the worst possible answer to it — it points
 * at the code when the fix is one field in a dashboard. So name the likely cause
 * per status and pass Supabase's own message through.
 *
 * Nothing secret goes out: Storage error bodies carry a reason string, never the
 * service key and never the signed token we sent.
 */
function storageFailure(httpStatus: number, detail: string): StorageError {
  const trimmed = detail.trim().slice(0, 300)

  /**
   * Prefer the status inside the body over the HTTP one. A missing bucket comes
   * back as HTTP 400 wrapping {"statusCode":"404","message":"The related resource
   * does not exist"} — read only the outer 400 and you tell the operator to check
   * the object path when the bucket simply isn't there.
   */
  let status = httpStatus
  try {
    const inner = Number((JSON.parse(trimmed) as { statusCode?: string | number }).statusCode)
    if (Number.isFinite(inner) && inner >= 400) status = inner
  } catch {
    // Not JSON, or truncated mid-object. The HTTP status is all we have.
  }

  const hint =
    status === 404
      ? `bucket "${env.SUPABASE_STORAGE_BUCKET}" does not exist in this Supabase project — create it with the public toggle OFF, or fix SUPABASE_STORAGE_BUCKET`
      : status === 400
        ? 'Supabase rejected the request — usually a bucket name or object path problem'
        : status === 401 || status === 403
          ? 'SUPABASE_SERVICE_ROLE_KEY is missing, wrong, or is the anon key rather than service_role'
          : status === 413
            ? "the file is larger than the bucket's upload limit"
            : 'Supabase Storage returned an unexpected status'

  return new StorageError(
    status,
    `Video storage is misconfigured: ${hint}. Supabase said ${status}${trimmed ? `: ${trimmed}` : ''}.`,
    status === 404 ? 'STORAGE_BUCKET_MISSING' : 'STORAGE_MISCONFIGURED',
  )
}

/**
 * Supabase Storage, private bucket.
 *
 * Deliberately no @supabase/supabase-js: all three operations we need are one
 * HTTP call each, and Node 20+ has global fetch. Adding the SDK to save ~40
 * lines would mean a dependency install and a bigger serverless bundle.
 *
 * Note there is no acceptDirectUpload — bytes go browser -> Supabase and never
 * touch the API, which is also what keeps us under Vercel's 4.5 MB body cap.
 */
class SupabaseMediaProvider implements MediaProvider {
  readonly name = 'supabase'

  private readonly base: string
  private readonly bucket: string
  private readonly key: string

  constructor() {
    // env.ts already guarantees these are present when MEDIA_PROVIDER=supabase.
    this.base = `${env.SUPABASE_URL!.replace(/\/+$/, '')}/storage/v1`
    this.bucket = env.SUPABASE_STORAGE_BUCKET
    this.key = env.SUPABASE_SERVICE_ROLE_KEY!
  }

  private async call<T>(method: string, urlPath: string, body?: unknown): Promise<T> {
    let res: Response
    try {
      res = await fetch(`${this.base}${urlPath}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.key}`,
          apikey: this.key,
          'Content-Type': 'application/json',
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
    } catch (cause) {
      // A DNS or TLS failure here means SUPABASE_URL points somewhere that isn't
      // a Supabase project. Distinguish it from a project that answered badly.
      throw new HttpError(
        502,
        `Video storage is unreachable at SUPABASE_URL — ${(cause as Error).message}`,
        'STORAGE_UNREACHABLE',
      )
    }

    if (!res.ok) {
      throw storageFailure(res.status, await res.text().catch(() => ''))
    }
    return (await res.json()) as T
  }

  async createUploadTicket({
    mediaId,
    kind,
    contentType,
  }: {
    mediaId: string
    kind: string
    contentType?: string
  }): Promise<UploadTicket> {
    const objectPath = objectPathFor(mediaId, kind, contentType)

    let url: string
    try {
      url = await this.signUpload(objectPath)
    } catch (err) {
      // A brand new Supabase project has no buckets, so the very first upload of
      // every deploy would otherwise fail on a step no code path can recover from
      // and no student can act on. Create it and retry once.
      if (!(err instanceof StorageError) || err.code !== 'STORAGE_BUCKET_MISSING') throw err
      await this.createBucket()
      url = await this.signUpload(objectPath)
    }

    return {
      uploadUrl: `${this.base}${url}`,
      externalId: objectPath,
      headers: { 'content-type': contentType ?? 'video/webm' },
    }
  }

  /** Response url is relative and already carries ?token=<jwt>. */
  private async signUpload(objectPath: string): Promise<string> {
    const { url } = await this.call<{ url: string }>(
      'POST',
      `/object/upload/sign/${this.bucket}/${objectPath}`,
      {},
    )
    return url
  }

  /**
   * Create the bucket, private.
   *
   * `public: false` is not a default being restated — it is the single most
   * important line in this file. A public bucket puts every student's practice
   * video on the open internet behind a guessable path, which breaks the DPDP
   * promise the whole product rests on. Playback goes through signedPlaybackUrl()
   * precisely so the bucket never has to be public.
   *
   * A 409 means another container won the race. That is success, not failure.
   */
  private async createBucket(): Promise<void> {
    try {
      await this.call('POST', '/bucket', { name: this.bucket, id: this.bucket, public: false })
      console.warn(`[media] created missing private Supabase bucket "${this.bucket}"`)
    } catch (err) {
      if (!(err instanceof StorageError) || err.storageStatus !== 409) throw err
    }
  }

  async signedPlaybackUrl(externalId: string, expiresInSeconds: number): Promise<string> {
    const { signedURL } = await this.call<{ signedURL: string }>(
      'POST',
      `/object/sign/${this.bucket}/${externalId}`,
      { expiresIn: expiresInSeconds },
    )
    return `${this.base}${signedURL}`
  }

  async deleteObject(externalId: string): Promise<void> {
    await this.call('DELETE', `/object/${this.bucket}`, { prefixes: [externalId] })
  }

  /**
   * The bucket is private, so an unsigned URL is not playable — it exists only
   * to satisfy the interface. Callers that need a working URL must use
   * signedPlaybackUrl(); the routes check for it before falling back here.
   */
  playbackUrlFor(externalId: string): string {
    return `${this.base}/object/${this.bucket}/${externalId}`
  }
}

/**
 * Cloudflare R2, private bucket, reached over its S3-compatible API.
 *
 * Deliberately the presigning path rather than the Worker `MEDIA_BUCKET`
 * binding. The binding only exists inside Workers, so the same code would have
 * to be rewritten when the API runs on Vercel; worse, a bound upload has to be
 * piped through the Worker itself, which buffers the whole video under a 128 MB
 * memory cap and has no way to hand out a presigned GET. SigV4 gives us the
 * browser-to-bucket path and time-limited playback on both hosts.
 *
 * aws4fetch over @aws-sdk/client-s3: it is ~2 KB against a multi-megabyte SDK,
 * signs through crypto.subtle (so it runs unmodified in Workers and Node 20),
 * and all we need is three signed requests.
 */
class R2MediaProvider implements MediaProvider {
  readonly name = 'r2'

  /** SigV4 presigning is capped at seven days by the protocol; R2 enforces it. */
  readonly maxPlaybackTtlSeconds = 7 * 24 * 60 * 60

  private readonly client: AwsClient
  private readonly endpoint: string
  private readonly bucket: string
  private readonly publicBase?: string

  constructor() {
    // env.ts already guarantees these are present when MEDIA_PROVIDER=r2.
    this.bucket = env.R2_BUCKET
    this.endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    this.publicBase = env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, '') || undefined
    this.client = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      service: 's3',
      region: 'auto',
    })
  }

  /**
   * Sign a URL into the query string, with the expiry set *before* signing.
   *
   * aws4fetch only supplies X-Amz-Expires when the caller left it out (it
   * defaults to 86400) and never clamps, so a longer value would be signed and
   * then rejected by R2 with a 403 — a signature that is structurally correct
   * and still fails. Each caller passes a value it has already bounded.
   */
  private async presign(
    method: 'GET' | 'PUT',
    key: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const url = new URL(`${this.endpoint}/${this.bucket}/${key}`)
    url.searchParams.set('X-Amz-Expires', String(Math.max(1, Math.floor(expiresInSeconds))))
    const { url: signed } = await this.client.sign(new Request(url, { method }), {
      aws: { signQuery: true },
    })
    return signed.toString()
  }

  async createUploadTicket({
    mediaId,
    kind,
    contentType,
  }: {
    mediaId: string
    kind: string
    contentType?: string
  }): Promise<UploadTicket> {
    const key = objectPathFor(mediaId, kind, contentType)
    return {
      uploadUrl: await this.presign('PUT', key, R2_UPLOAD_TTL_SECONDS),
      externalId: key,
      // content-type is explicitly excluded from the SigV4 signature by
      // aws4fetch, so the browser can send whatever MediaRecorder produced.
      headers: { 'content-type': contentType ?? 'video/webm' },
    }
  }

  async signedPlaybackUrl(externalId: string, expiresInSeconds: number): Promise<string> {
    const ttl = Math.min(expiresInSeconds, this.maxPlaybackTtlSeconds)
    return this.presign('GET', externalId, ttl)
  }

  /**
   * A real DELETE, not the retention job's opinion of one. R2 answers 204 for a
   * key that already does not exist, which is the outcome the caller wanted.
   */
  async deleteObject(externalId: string): Promise<void> {
    let res: Response
    try {
      res = await this.client.fetch(`${this.endpoint}/${this.bucket}/${externalId}`, {
        method: 'DELETE',
      })
    } catch (cause) {
      throw new HttpError(
        502,
        `Video storage is unreachable at R2 — ${(cause as Error).message}`,
        'STORAGE_UNREACHABLE',
      )
    }
    if (!res.ok && res.status !== 404) {
      throw new HttpError(
        502,
        `R2 refused to delete ${externalId} (${res.status}). Check that R2_ACCESS_KEY_ID has Object Read & Write on "${this.bucket}".`,
        'STORAGE_MISCONFIGURED',
      )
    }
  }

  /**
   * Only meaningful if a public custom domain was configured for the bucket.
   * Unsigned endpoint URLs are not fetchable, exactly as the Supabase class
   * documents — callers that need a working URL go through playableUrl().
   */
  playbackUrlFor(externalId: string): string {
    return this.publicBase
      ? `${this.publicBase}/${externalId}`
      : `${this.endpoint}/${this.bucket}/${externalId}`
  }
}

/** How long a browser has to finish a direct PUT. Generous for a 2-minute clip. */
const R2_UPLOAD_TTL_SECONDS = 60 * 60

/**
 * A fresh, playable URL for a MediaAsset row — or null when the bytes are gone.
 *
 * Every playback surface should call this instead of reading `playbackUrl`
 * directly. For providers that sign, the stored column is null by design: a URL
 * minted at upload time expires long before the row does (7 days against 365),
 * and a dead link in a <video> shows no error to anyone.
 *
 * `provider` is the row's own column, not the active env value, so an asset
 * written by a previous deploy still resolves through the provider that holds
 * it. Signing only happens when that provider is the one this process can talk
 * to — otherwise the stored URL is the only honest answer.
 */
export async function playableUrl(media: {
  provider: string
  externalId: string | null
  playbackUrl: string | null
  status?: string
  deletedAt?: Date | null
  retentionUntil?: Date | null
}): Promise<string | null> {
  if (media.deletedAt || media.status === 'deleted' || media.status === 'failed') return null
  if (!media.externalId) return media.playbackUrl

  const canSign = media.provider === mediaProvider.name && Boolean(mediaProvider.signedPlaybackUrl)
  if (!canSign) {
    return media.playbackUrl ?? mediaProvider.playbackUrlFor(media.externalId)
  }

  return mediaProvider.signedPlaybackUrl!(media.externalId, playbackTtlSeconds(media.retentionUntil))
}

/**
 * Mint a link that dies no later than the video it points at.
 *
 * Clamped by the provider's own ceiling first (7 days for R2), then by what is
 * left of the retention window. Never below a minute: an asset past its
 * retention deadline but not yet swept would otherwise arrive pre-expired.
 */
function playbackTtlSeconds(retentionUntil: Date | null | undefined): number {
  const ceiling = mediaProvider.maxPlaybackTtlSeconds ?? MAX_SIGNED_URL_SECONDS
  if (!retentionUntil) return ceiling
  const remaining = Math.floor((retentionUntil.getTime() - Date.now()) / 1000)
  return Math.min(ceiling, Math.max(60, remaining))
}

/**
 * What to store in MediaAsset.playbackUrl for an asset that just went ready.
 *
 * Signing providers get null — see playableUrl(). Local dev keeps its relative
 * path so the file is served by @fastify/static with no signing step at all.
 */
export function persistablePlaybackUrl(url: string | null): string | null {
  return mediaProvider.signedPlaybackUrl ? null : url
}

function build(): MediaProvider {
  switch (env.MEDIA_PROVIDER) {
    case 'local':
      return new LocalMediaProvider()
    case 'supabase':
      return new SupabaseMediaProvider()
    case 'r2':
    case 'cloudflare':
      return new R2MediaProvider()
    default:
      return new LocalMediaProvider()
  }
}

export const mediaProvider = build()
