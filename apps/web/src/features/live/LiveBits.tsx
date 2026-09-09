import { Link } from 'react-router-dom'
import {
  LIVE_CLASS_STATUS_LABELS,
  SKILL_LABELS,
  type Language,
  type LiveClassStatus,
  type Skill,
} from '@skillflex/shared'
import { Card, Pill, formatDateTime, formatRelative } from '../../components/ui'

/**
 * Exactly what `serializeClass()` in the API's live module returns, with Dates
 * as the ISO strings JSON gives us. One declaration for all three live screens —
 * they show the same object at different points in its life.
 */
export interface LiveClassView {
  id: string
  title: string
  description: string | null
  skill: string | null
  language: Language
  status: LiveClassStatus
  scheduledAt: string
  durationMinutes: number
  capacity: number
  seatsTaken: number
  seatsLeft: number
  isFull: boolean
  mentor: { id: string; name: string; headline: string | null }
  joinOpensAt: string
  joinClosesAt: string
  canJoin: boolean
  joinBlockedReason: string | null
  joinUrl: string | null
  isRegistered: boolean
  attendedAt: string | null
  startedAt: string | null
  endedAt: string | null
  hasRecording: boolean
  recordingPublishedAt: string | null
  recordingPlaybackUrl: string | null
  recordingDurationSeconds: number | null
  watchedSeconds: number
  completedAt: string | null
}

export function skillLabel(skill: string | null): string | null {
  if (!skill) return null
  return SKILL_LABELS[skill as Skill] ?? skill
}

/** Status as a pill, with the pulsing dot when it is genuinely in progress. */
export function LiveStatusPill({ status }: { status: LiveClassStatus }) {
  if (status === 'live') {
    return (
      <span className="pill pill-danger">
        <span className="rec-dot" />
        Live now
      </span>
    )
  }
  const tone = status === 'cancelled' ? 'warn' : status === 'ended' ? 'default' : 'brand'
  return <Pill tone={tone}>{LIVE_CLASS_STATUS_LABELS[status]}</Pill>
}

/**
 * One lecture in a list. Same card whether it is upcoming, live, or a recording
 * in the library — the difference is which line of metadata matters, so that is
 * all `variant` changes.
 */
export function LiveClassCard({
  cls,
  variant = 'upcoming',
}: {
  cls: LiveClassView
  variant?: 'upcoming' | 'recording'
}) {
  const watchedPct =
    cls.recordingDurationSeconds && cls.watchedSeconds > 0
      ? Math.min(100, Math.round((cls.watchedSeconds / cls.recordingDurationSeconds) * 100))
      : 0

  /** Over and done with. "3 seats left" on a finished lecture is nonsense. */
  const isPast = cls.status === 'ended' || cls.status === 'cancelled'

  return (
    <Link to={`/live/${cls.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <Card className="card-interactive" accent={cls.status === 'live'}>
        <div className="row-between" style={{ marginBottom: '0.4rem' }}>
          <span className="tiny faint">
            {skillLabel(cls.skill)?.toUpperCase() ?? 'LIVE LECTURE'}
          </span>
          {variant === 'recording' ? (
            cls.completedAt ? (
              <Pill tone="ok">Watched</Pill>
            ) : watchedPct > 0 ? (
              <Pill tone="warn">{watchedPct}% watched</Pill>
            ) : (
              <Pill>Recording</Pill>
            )
          ) : (
            <LiveStatusPill status={cls.status} />
          )}
        </div>

        <div className="strong">{cls.title}</div>
        <div className="tiny dim" style={{ marginTop: '0.2rem' }}>
          {cls.mentor.name}
          {cls.mentor.headline ? ` · ${cls.mentor.headline}` : ''}
        </div>

        <div className="row wrap" style={{ gap: '0.35rem', marginTop: '0.6rem' }}>
          {variant === 'recording' ? (
            <>
              <Pill>{formatDateTime(cls.recordingPublishedAt)}</Pill>
              <Pill>{cls.durationMinutes} min</Pill>
            </>
          ) : isPast ? (
            <>
              <Pill>{formatDateTime(cls.scheduledAt)}</Pill>
              <Pill>{cls.durationMinutes} min</Pill>
              {cls.status === 'cancelled' ? (
                <Pill tone="warn">Did not run</Pill>
              ) : cls.attendedAt ? (
                <Pill tone="ok">You attended</Pill>
              ) : (
                <Pill tone="warn">You missed it</Pill>
              )}
              {cls.hasRecording && <Pill tone="brand">Recording</Pill>}
            </>
          ) : (
            <>
              <Pill tone={cls.status === 'live' ? 'danger' : 'default'}>
                {cls.status === 'live' ? 'Started' : formatRelative(cls.scheduledAt)}
              </Pill>
              <Pill>{formatDateTime(cls.scheduledAt)}</Pill>
              <Pill>{cls.durationMinutes} min</Pill>
              {cls.isRegistered ? (
                <Pill tone="ok">Registered</Pill>
              ) : cls.isFull ? (
                <Pill tone="warn">Full</Pill>
              ) : (
                <Pill>{cls.seatsLeft} seats left</Pill>
              )}
            </>
          )}
          <Pill>{cls.language.toUpperCase()}</Pill>
        </div>
      </Card>
    </Link>
  )
}
