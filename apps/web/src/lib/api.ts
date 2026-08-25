/**
 * Tiny fetch wrapper. Everything goes through /api (Vite proxies it in dev,
 * same-origin in prod). The JWT lives in localStorage — fine for this product's
 * threat model; a refresh-token dance is deferred until there's a reason.
 */

const TOKEN_KEY = 'skillswitch.token'

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

  const res = await fetch(`/api${path}`, { method, headers, body: payload })

  if (res.status === 204) return undefined as T

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err: ApiError = data?.error ?? { message: 'Request failed' }
    // A dead/expired token: drop it so the app falls back to the login screen.
    if (res.status === 401) setToken(null)
    throw new ApiRequestError(res.status, err)
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
