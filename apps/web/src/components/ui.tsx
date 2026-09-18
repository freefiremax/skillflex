import { useState, type CSSProperties, type ReactNode } from 'react'
import { ApiRequestError } from '../lib/api'

export function Card({
  children,
  accent,
  onClick,
  className = '',
}: {
  children: ReactNode
  accent?: boolean
  onClick?: () => void
  className?: string
}) {
  const classes = [
    'card',
    accent ? 'card-accent' : '',
    onClick ? 'card-interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (onClick) {
    return (
      <div
        className={classes}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      >
        {children}
      </div>
    )
  }
  return <div className={classes}>{children}</div>
}

export function Pill({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'brand' | 'ok' | 'warn' | 'danger'
}) {
  const map = {
    default: 'pill',
    brand: 'pill pill-brand',
    ok: 'pill pill-ok',
    warn: 'pill pill-warn',
    danger: 'pill pill-danger',
  }
  return <span className={map[tone]}>{children}</span>
}

export function Alert({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'error' | 'ok' | 'warn'
  children: ReactNode
}) {
  return <div className={`alert alert-${tone}`}>{children}</div>
}

/** Turns whatever the API threw into one readable line. */
export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null
  let message = 'Something went wrong'
  if (error instanceof ApiRequestError) {
    message = error.body.fields?.length
      ? `${error.body.message}: ${error.body.fields.map((f) => `${f.path} ${f.message}`).join(', ')}`
      : error.body.message
  } else if (error instanceof Error) {
    message = error.message
  }
  return <Alert tone="error">{message}</Alert>
}

export function Empty({ icon = '·', title, body }: { icon?: string; title: string; body?: string }) {
  return (
    <div className="empty">
      <span className="empty-icon">{icon}</span>
      <div className="strong">{title}</div>
      {body ? <div className="small" style={{ marginTop: 4 }}>{body}</div> : null}
    </div>
  )
}

/**
 * A decorative illustration that degrades to a glyph instead of a broken image.
 *
 * Home's artwork lives in `public/assets/art/` and is dropped in separately from
 * the code, so the page has to be complete before any file exists. A bare `<img>`
 * whose src 404s renders the browser's broken-image icon — and on this deploy it
 * is worse than a 404: the SPA fallback rewrite answers with index.html, so the
 * element is handed HTML and shows the same torn-page glyph. Same failure mode
 * `PlaybackVideo` above exists for.
 *
 * `alt` defaults to empty because every use here sits beside a heading that
 * already says the same thing; announcing "microphone" after "Record your
 * answer" is noise. Pass one only if the picture carries information the text
 * does not.
 */
export function Art({
  src,
  alt = '',
  fallback,
  className = '',
}: {
  src: string
  /** Leave empty for decoration. */
  alt?: string
  /** Shown instead when the file is missing. */
  fallback: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span className={`art art-fallback ${className}`.trim()} aria-hidden>
        {fallback}
      </span>
    )
  }

  return (
    <img
      className={`art ${className}`.trim()}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}

/**
 * A <video> that admits when its source is dead.
 *
 * A bare <video src> whose URL 404s renders as a permanently blank player with no
 * error anywhere — and on this deploy a stale URL does not even 404: the SPA
 * fallback rewrite answers with index.html, so the element is handed HTML and just
 * sits there. Signed playback URLs also expire, which produces the same silence.
 * Surface it instead of letting the user conclude the app is broken.
 */
export function PlaybackVideo({
  src,
  className = 'video-frame',
  style,
  missingTitle = 'Recording unavailable',
  missingBody = 'This video could not be loaded. It may have expired or been removed.',
}: {
  src: string | null | undefined
  className?: string
  style?: CSSProperties
  missingTitle?: string
  missingBody?: string
}) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <Card>
        <Empty icon="▶" title={missingTitle} body={missingBody} />
      </Card>
    )
  }

  return (
    <video
      className={className}
      style={style}
      src={src}
      controls
      playsInline
      onError={() => setFailed(true)}
    />
  )
}

export function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="stack">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  )
}

export function Meter({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="meter" aria-label={`${value} out of ${max}`}>
      <div className="meter-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, { tone: 'default' | 'brand' | 'ok' | 'warn'; label: string }> = {
    not_started: { tone: 'default', label: 'Not started' },
    draft: { tone: 'default', label: 'Draft' },
    uploading: { tone: 'warn', label: 'Uploading' },
    submitted: { tone: 'brand', label: 'Waiting for mentor' },
    in_review: { tone: 'warn', label: 'Mentor watching' },
    reviewed: { tone: 'ok', label: 'Feedback ready' },
  }
  const hit = map[status] ?? { tone: 'default' as const, label: status }
  return <Pill tone={hit.tone}>{hit.label}</Pill>
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatDate(value: string | Date | null, lang: string = 'en'): string {
  if (!value) return '—'
  const locale = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN'
  return new Date(value).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Date *and* clock time — a lecture at "3 Sep" tells a student nothing. */
export function formatDateTime(value: string | Date | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * "in 40 min", "in 3 days", "25 min ago".
 *
 * Coarser the further out it is, on purpose: "in 2 days 4 hours 12 minutes" is
 * technically better and practically worse, and a lecture three days out does
 * not need minute precision.
 */
export function formatRelative(value: string | Date | null): string {
  if (!value) return '—'
  const diff = new Date(value).getTime() - Date.now()
  const ahead = diff >= 0
  const mins = Math.round(Math.abs(diff) / 60_000)

  let text: string
  if (mins < 1) text = 'now'
  else if (mins < 60) text = `${mins} min`
  else if (mins < 60 * 24) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    text = m === 0 ? `${h} hr` : `${h} hr ${m} min`
  } else {
    const days = Math.round(mins / (60 * 24))
    text = `${days} day${days > 1 ? 's' : ''}`
  }

  if (text === 'now') return 'now'
  return ahead ? `in ${text}` : `${text} ago`
}
