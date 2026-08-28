/**
 * Tiny fetch wrapper. Everything goes through /api (Vite proxies it in dev,
 * same-origin in prod). The JWT lives in localStorage — fine for this product's
 * threat model; a refresh-token dance is deferred until there's a reason.
 */

const TOKEN_KEY = 'skillflex.token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export interface ApiError {
  message: string
  code?: string
  fields?: Array<{ path: string; message: string }>
}

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public body: ApiError,
  ) {
    super(body.message)
  }
}

/**
 * Fired when the server rejects our token, so the auth provider can drop `me`
 * and fall back to the login screen.
 *
 * Clearing localStorage alone is not enough: a tab that was already open keeps
 * its authenticated shell rendered and quietly sends anonymous requests, so
 * every panel fills with "Not signed in" until the user reloads by hand.
 */
type UnauthorizedListener = () => void
let unauthorizedListener: UnauthorizedListener | undefined

export function onUnauthorized(listener: UnauthorizedListener | undefined) {
  unauthorizedListener = listener
}

/**
 * Describe a failure whose body is not our { error: { code, message } } envelope.
 *
 * This path is load-bearing, not defensive padding. A platform-level 404 or 500
 * from the host returns an HTML error page, `res.json()` throws, and the old code
 * collapsed every such case to the string "Request failed" — which is exactly
 * what masked a real API boot failure behind a message that read like a wrong
 * password. Say what actually came back.
 */
function describeNonJsonFailure(res: Response, raw: string): ApiError {
  const status = `${res.status}${res.statusText ? ` ${res.statusText}` : ''}`

  if (raw.trimStart().startsWith('<')) {
    return {
      message: `Server returned ${status} as an HTML page instead of JSON — the API route is probably not deployed or is being swallowed by the SPA fallback.`,
      code: 'NON_JSON_RESPONSE',
    }
  }

  const snippet = raw.trim().slice(0, 300)
  return {
    message: snippet ? `Server returned ${status}: ${snippet}` : `Server returned ${status} with an empty body.`,
    code: 'NON_JSON_RESPONSE',
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let payload: BodyInit | undefined
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let res: Response
  try {
    res = await fetch(`/api${path}`, { method, headers, body: payload })
  } catch {
    // fetch only rejects on a transport failure — DNS, offline, CORS preflight.
    // Distinguish it from an HTTP error so the user is not told to check a
    // password when the phone simply lost signal.
    throw new ApiRequestError(0, {
      message: 'Could not reach the server. Check your connection and try again.',
      code: 'NETWORK_ERROR',
    })
  }

  if (res.status === 204) return undefined as T

  // Read as text first: a body can only be consumed once, and we need the raw
  // string to report anything useful when it is not JSON.
  const raw = await res.text()
  let data: { error?: ApiError } | undefined
  if (raw) {
    try {
      data = JSON.parse(raw)
    } catch {
      data = undefined
    }
  }

  if (!res.ok) {
    const err: ApiError = data?.error ?? describeNonJsonFailure(res, raw)
    // A dead/expired token: drop it so the app falls back to the login screen.
    if (res.status === 401) {
      setToken(null)
      unauthorizedListener?.()
    }
    throw new ApiRequestError(res.status, err)
  }

  if (!raw) return undefined as T
  if (data === undefined) {
    // A 200 that isn't JSON means index.html came back in place of the API —
    // returning it as T would fail later, somewhere far less obvious.
    throw new ApiRequestError(res.status, describeNonJsonFailure(res, raw))
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),

  /** Raw upload for the local media provider (multipart, own progress). */
  async upload(path: string, file: Blob, filename: string): Promise<{ mediaId: string; playbackUrl: string }> {
    const form = new FormData()
    form.append('file', file, filename)
    return request('POST', path, form)
  },
}
