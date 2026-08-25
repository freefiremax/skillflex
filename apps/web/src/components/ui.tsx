import type { ReactNode } from 'react'
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

export function formatDate(value: string | Date | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
