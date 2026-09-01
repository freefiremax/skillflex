import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { LANGUAGE_LABELS } from '@skillflex/shared'
import { api } from '../../lib/api'
import {
  Alert,
  Card,
  Empty,
  ErrorNote,
  Loading,
  Meter,
  Pill,
  formatDateTime,
  formatDuration,
  formatRelative,
} from '../../components/ui'
import { LiveStatusPill, skillLabel, type LiveClassView } from './LiveBits'

/** How often watch position is reported. Often enough to survive a closed tab,
 *  rarely enough that a 45-minute recording is ~10 requests, not 2700. */
const PROGRESS_INTERVAL_SECONDS = 20

/** Below this we don't offer to resume — it's the start, not a position. */
const RESUME_THRESHOLD_SECONDS = 15

/**
 * The recording player.
 *
 * Owns two things the plain <video> does not: it resumes where the student left
 * off, and it reports progress back so "watched" is a fact rather than a guess.
 */
function RecordingPlayer({ cls, onProgress }: { cls: LiveClassView; onProgress: (s: number) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastSent = useRef(0)
  const [failed, setFailed] = useState(false)

  // Seek once, on the metadata event — before that, currentTime assignments are
  // silently dropped because the element has no duration to seek within yet.
  const resumeFrom = cls.completedAt ? 0 : cls.watchedSeconds
  useEffect(() => {
    lastSent.current = cls.watchedSeconds
  }, [cls.watchedSeconds])

  if (!cls.recordingPlaybackUrl || failed) {
    return (
      <Card>
        <Empty
          icon="▶"
          title="Recording unavailable"
          body="This recording could not be loaded. It may have expired or been removed."
        />
      </Card>
    )
  }

  return (
    <video
      ref={videoRef}
      className="video-frame"
      src={cls.recordingPlaybackUrl}
      controls
      playsInline
      onError={() => setFailed(true)}
      onLoadedMetadata={() => {
        if (resumeFrom > RESUME_THRESHOLD_SECONDS && videoRef.current) {
          videoRef.current.currentTime = resumeFrom
        }
      }}
      onTimeUpdate={(e) => {
        const at = Math.floor(e.currentTarget.currentTime)
        if (at - lastSent.current >= PROGRESS_INTERVAL_SECONDS) {
          lastSent.current = at
          onProgress(at)
        }
      }}
      // Reaching the end is the one moment worth reporting exactly — the
      // 20-second sampling above would otherwise round a finished video down.
      onEnded={(e) => onProgress(Math.floor(e.currentTarget.currentTime))}
      onPause={(e) => {
        const at = Math.floor(e.currentTarget.currentTime)
        if (at > lastSent.current) {
          lastSent.current = at
          onProgress(at)
        }
      }}
    />
  )
}

export default function LiveClassPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['live-class', id],
    queryFn: () => api.get<{ class: LiveClassView }>(`/live/classes/${id}`),
    enabled: Boolean(id),
    /**
     * While a lecture is upcoming or running, the interesting state lives on the
     * server: whether the mentor has started, and whether the last seat went. A
     * student staring at a stale "waiting for the mentor" is the failure mode.
     */
    refetchInterval: (query) => {
      const status = query.state.data?.class.status
      return status === 'scheduled' || status === 'live' ? 20_000 : false
    },
  })

  const cls = data?.class

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['live-class', id] })
    await queryClient.invalidateQueries({ queryKey: ['live-classes'] })
    await queryClient.invalidateQueries({ queryKey: ['live-my-classes'] })
    await queryClient.invalidateQueries({ queryKey: ['live-next'] })
  }

  const register = useMutation({
    mutationFn: () => api.post(`/live/classes/${id}/register`),
    onSuccess: invalidate,
  })

  const unregister = useMutation({
    mutationFn: () => api.del(`/live/classes/${id}/register`),
    onSuccess: invalidate,
  })

  /**
   * Opening the room is a two-step: ask the server for the link (which is also
   * what records attendance), then open it. The link is never in the page
   * beforehand — see serializeClass() in the API.
   */
  const join = useMutation({
    mutationFn: () => api.post<{ joinUrl: string | null }>(`/live/classes/${id}/join`),
    onSuccess: async (res) => {
      if (res.joinUrl) window.open(res.joinUrl, '_blank', 'noopener,noreferrer')
      await invalidate()
    },
  })

  const progress = useMutation({
    mutationFn: (watchedSeconds: number) =>
      api.post(`/live/recordings/${id}/progress`, { watchedSeconds }),
    /**
     * No invalidate: refetching the class mid-playback would re-render the
     * <video> and yank the student back to the resume point. The server has the
     * number; the screen catches up on next visit.
     */
  })

  if (isLoading) return <Loading rows={4} />
  if (error) return <ErrorNote error={error} />
  if (!cls) return null

  const watchedPct =
    cls.recordingDurationSeconds && cls.watchedSeconds > 0
      ? Math.min(100, Math.round((cls.watchedSeconds / cls.recordingDurationSeconds) * 100))
      : 0
  const showRecording = cls.hasRecording && cls.status !== 'live'

  return (
    <div className="stack">
      <button
        className="btn btn-ghost btn-sm"
        style={{ alignSelf: 'flex-start' }}
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <div>
        <div className="row-between" style={{ marginBottom: '0.3rem' }}>
          <span className="tiny faint">{skillLabel(cls.skill)?.toUpperCase() ?? 'LIVE LECTURE'}</span>
          <LiveStatusPill status={cls.status} />
        </div>
        <h1>{cls.title}</h1>
        <p className="small">
          {cls.mentor.name}
          {cls.mentor.headline ? ` · ${cls.mentor.headline}` : ''}
        </p>
      </div>

      {showRecording ? (
        <>
          <RecordingPlayer cls={cls} onProgress={(s) => progress.mutate(s)} />

          <Card className="card-tight">
            <div className="row-between" style={{ marginBottom: watchedPct > 0 ? '0.5rem' : 0 }}>
              <span className="tiny faint">
                {cls.completedAt
                  ? 'YOU FINISHED THIS'
                  : watchedPct > 0
                    ? `RESUMED AT ${formatDuration(cls.watchedSeconds)}`
                    : 'RECORDED LECTURE'}
              </span>
              {cls.completedAt ? (
                <Pill tone="ok">Watched</Pill>
              ) : (
                <Pill>
                  {cls.recordingDurationSeconds
                    ? formatDuration(cls.recordingDurationSeconds)
                    : `${cls.durationMinutes} min`}
                </Pill>
              )}
            </div>
            {watchedPct > 0 && !cls.completedAt && (
              <Meter value={watchedPct} max={100} />
            )}
          </Card>
        </>
      ) : (
        <Card accent={cls.status === 'live'}>
          <div className="stack-sm">
            <div className="row-between">
              <span className="tiny faint">WHEN</span>
              <span className="small strong">{formatDateTime(cls.scheduledAt)}</span>
            </div>
            <div className="row-between">
              <span className="tiny faint">STARTS</span>
              <span className="small strong">
                {cls.status === 'live' ? 'Under way' : formatRelative(cls.scheduledAt)}
              </span>
            </div>
            <div className="row-between">
              <span className="tiny faint">ROOM OPENS</span>
              <span className="small">{formatDateTime(cls.joinOpensAt)}</span>
            </div>
            <div className="row-between">
              <span className="tiny faint">SEATS</span>
              <span className="small mono">
                {cls.seatsTaken}
                <span className="faint"> / {cls.capacity}</span>
              </span>
            </div>
            <Meter value={cls.seatsTaken} max={cls.capacity} />
          </div>
        </Card>
      )}

      {cls.description && (
        <Card>
          <div className="tiny faint" style={{ marginBottom: '0.35rem' }}>
            WHAT THIS COVERS
          </div>
          <div className="small dim" style={{ whiteSpace: 'pre-wrap' }}>
            {cls.description}
          </div>
        </Card>
      )}

      <div className="row wrap" style={{ gap: '0.35rem' }}>
        <Pill>{LANGUAGE_LABELS[cls.language]}</Pill>
        <Pill>{cls.durationMinutes} min</Pill>
        {cls.attendedAt && <Pill tone="ok">You attended</Pill>}
        {cls.hasRecording && cls.status === 'ended' && <Pill tone="brand">Recording available</Pill>}
      </div>

      <ErrorNote error={register.error ?? unregister.error ?? join.error} />

      {cls.status === 'cancelled' ? (
        <Alert tone="warn">
          This lecture was cancelled by the mentor.
          {cls.isRegistered ? ' Your seat has been released.' : ''}
        </Alert>
      ) : cls.status === 'ended' ? (
        !cls.hasRecording ? (
          <Alert tone="info">
            This lecture has ended and no recording has been published{' '}
            {cls.attendedAt ? 'yet.' : 'yet — ask your mentor if you missed it.'}
          </Alert>
        ) : null
      ) : !cls.isRegistered ? (
        <>
          <button
            className="btn btn-primary btn-block"
            disabled={register.isPending || cls.isFull}
            onClick={() => register.mutate()}
          >
            {cls.isFull ? 'Class is full' : register.isPending ? 'Registering…' : 'Register for this lecture'}
          </button>
          <div className="tiny faint center">
            {cls.isFull
              ? 'Every seat is taken. The recording will be published here afterwards.'
              : 'Registering reserves your seat and gets you the room link when it opens.'}
          </div>
        </>
      ) : cls.canJoin ? (
        <>
          <button
            className="btn btn-record btn-block"
            disabled={join.isPending}
            onClick={() => join.mutate()}
          >
            {join.isPending ? 'Opening…' : 'Join the room →'}
          </button>
          <div className="tiny faint center">Opens in a new tab. Your attendance is recorded.</div>
        </>
      ) : (
        <>
          <button className="btn btn-primary btn-block" disabled>
            {cls.joinBlockedReason ?? 'Not open yet'}
          </button>
          {/* Leaving is only allowed before it starts, so the button disappears
              once it does rather than sitting there failing. */}
          {cls.status === 'scheduled' && (
            <button
              className="btn btn-ghost btn-block"
              disabled={unregister.isPending}
              onClick={() => unregister.mutate()}
            >
              {unregister.isPending ? 'Cancelling…' : 'Give up my seat'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
