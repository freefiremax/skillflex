import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { LANGUAGE_LABELS } from '@skillflex/shared'
import { api } from '../../lib/api'
import {
  Alert,
  Empty,
  ErrorNote,
  Loading,
  Pill,
  formatDateTime,
  formatDuration,
  formatRelative,
} from '../../components/ui'
import { LiveStatusPill, skillLabel, type LiveClassView } from './LiveBits'

const PROGRESS_INTERVAL_SECONDS = 20
const RESUME_THRESHOLD_SECONDS = 15

function RecordingPlayer({ cls, onProgress }: { cls: LiveClassView; onProgress: (s: number) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastSent = useRef(0)
  const [failed, setFailed] = useState(false)

  const resumeFrom = cls.completedAt ? 0 : cls.watchedSeconds
  useEffect(() => {
    lastSent.current = cls.watchedSeconds
  }, [cls.watchedSeconds])

  if (!cls.recordingPlaybackUrl || failed) {
    return (
      <div className="master-card">
        <Empty
          icon="▶"
          title="Recording unavailable"
          body="This recording could not be loaded. It may have expired or been removed."
        />
      </div>
    )
  }

  return (
    <video
      ref={videoRef}
      className="video-frame"
      style={{ width: '100%', borderRadius: '22px', maxHeight: '420px', background: '#000' }}
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

  // Chat & interactive state for Live Now view
  const [activeSideTab, setActiveSideTab] = useState<'participants' | 'chat'>('participants')
  const [chatMessages, setChatMessages] = useState([
    { sender: 'Rohan', text: 'This is very helpful!', time: '6:05 PM' },
    { sender: 'Priya', text: 'Can you explain with an example?', time: '6:06 PM' },
    { sender: 'Aman', text: 'Great session!', time: '6:07 PM' },
  ])
  const [inputMsg, setInputMsg] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['live-class', id],
    queryFn: () => api.get<{ class: LiveClassView }>(`/live/classes/${id}`),
    enabled: Boolean(id),
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
  })

  if (isLoading) return <Loading rows={4} />
  if (error) return <ErrorNote error={error} />
  if (!cls) return null

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMsg.trim()) return
    setChatMessages((prev) => [
      ...prev,
      { sender: 'You', text: inputMsg.trim(), time: 'Just now' },
    ])
    setInputMsg('')
  }

  const isLive = cls.status === 'live'
  const showRecording = cls.hasRecording && cls.status !== 'live'
  const isPast = cls.status === 'ended' || cls.status === 'cancelled'
  const watchedPct =
    cls.recordingDurationSeconds && cls.watchedSeconds > 0
      ? Math.min(100, Math.round((cls.watchedSeconds / cls.recordingDurationSeconds) * 100))
      : 0

  // If the class is actively LIVE, render the Master Live Now experience
  if (isLive) {
    return (
      <div className="master-container">
        <button
          type="button"
          className="master-chip"
          style={{ marginBottom: '16px' }}
          onClick={() => navigate(-1)}
        >
          ← Exit session
        </button>

        {/* Live Now Hero */}
        <section className="master-hero">
          <div className="master-hero-copy">
            <h1>Live now</h1>
            <p>Teach. Interact. Inspire. You're making a difference!</p>
          </div>
          <div className="master-hero-art-wrapper">
            <img
              className="master-hero-art"
              src="/assets/master/mentor-live-now/hero.png"
              alt="SkillFlex live session"
            />
          </div>
        </section>

        {/* Live Stats Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
            marginBottom: '24px',
          }}
        >
          <div
            className="master-card"
            style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '18px 22px', margin: 0 }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '15px',
                background: '#e5f7ee',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--master-green)',
                fontSize: '22px',
              }}
            >
              👥
            </div>
            <div>
              <span style={{ color: 'var(--master-muted)', fontSize: '13px', display: 'block' }}>
                Live participants
              </span>
              <strong style={{ fontSize: '24px' }}>{cls.seatsTaken || 28}</strong>
            </div>
          </div>

          <div
            className="master-card"
            style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '18px 22px', margin: 0 }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '15px',
                background: '#e5f7ee',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--master-green)',
                fontSize: '22px',
              }}
            >
              ◷
            </div>
            <div>
              <span style={{ color: 'var(--master-muted)', fontSize: '13px', display: 'block' }}>
                Duration
              </span>
              <strong style={{ fontSize: '24px' }}>00:24:12</strong>
            </div>
          </div>

          <div
            className="master-card"
            style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '18px 22px', margin: 0 }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '15px',
                background: '#e5f7ee',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--master-green)',
                fontSize: '22px',
              }}
            >
              ▣
            </div>
            <div>
              <span style={{ color: 'var(--master-muted)', fontSize: '13px', display: 'block' }}>
                Recording
              </span>
              <strong style={{ fontSize: '20px', color: '#e94e5b' }}>🔴 ON</strong>
            </div>
          </div>
        </div>

        {/* Live Room Stage & Sidebar */}
        <div className="master-2col">
          {/* Main Stage */}
          <div>
            <article className="master-card" style={{ padding: '16px' }}>
              <div
                style={{
                  borderRadius: '22px',
                  overflow: 'hidden',
                  position: 'relative',
                  background: '#16202b',
                }}
              >
                <img
                  src="/assets/master/mentor-live-now/main-live.png"
                  alt="Live session video"
                  style={{ width: '100%', height: '420px', objectFit: 'cover', display: 'block' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '16px',
                    background: '#f22f45',
                    color: '#fff',
                    padding: '8px 14px',
                    borderRadius: '20px',
                    fontWeight: 800,
                    fontSize: '13px',
                  }}
                >
                  ◆ LIVE
                </span>
                <span
                  style={{
                    position: 'absolute',
                    left: '16px',
                    bottom: '16px',
                    background: 'rgba(0,0,0,0.72)',
                    color: '#fff',
                    padding: '8px 14px',
                    borderRadius: '14px',
                    fontWeight: 700,
                    fontSize: '14px',
                  }}
                >
                  🎙 {cls.mentor.name}
                </span>
              </div>

              {/* Controls */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))',
                  gap: '10px',
                  marginTop: '14px',
                }}
              >
                <button type="button" className="master-chip" style={{ textAlign: 'center', padding: '12px 6px' }}>
                  <span style={{ display: 'block', fontSize: '20px' }}>🎙</span> Mic
                </button>
                <button type="button" className="master-chip" style={{ textAlign: 'center', padding: '12px 6px' }}>
                  <span style={{ display: 'block', fontSize: '20px' }}>▣</span> Camera
                </button>
                <button type="button" className="master-chip" style={{ textAlign: 'center', padding: '12px 6px' }}>
                  <span style={{ display: 'block', fontSize: '20px' }}>▱</span> Share
                </button>
                <button
                  type="button"
                  className="master-chip"
                  style={{ textAlign: 'center', padding: '12px 6px' }}
                  onClick={() => setActiveSideTab('participants')}
                >
                  <span style={{ display: 'block', fontSize: '20px' }}>👥</span> Roster
                </button>
                {cls.canJoin && (
                  <button
                    type="button"
                    className="master-btn-primary"
                    style={{ gridColumn: 'span 2', justifyContent: 'center', padding: '12px' }}
                    onClick={() => join.mutate()}
                  >
                    Open Meeting Room →
                  </button>
                )}
              </div>

              {/* Quick Actions */}
              <div style={{ marginTop: '18px' }}>
                <h3 style={{ fontSize: '17px', margin: '0 0 10px', fontWeight: 800 }}>Quick actions</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  <button type="button" className="master-chip">▤ Show slides</button>
                  <button type="button" className="master-chip">▣ Take questions</button>
                  <button type="button" className="master-chip">▥ Add poll</button>
                  <button type="button" className="master-chip">🔗 Share resource</button>
                </div>
              </div>
            </article>
          </div>

          {/* Sidebar (Participants & Chat) */}
          <aside style={{ display: 'grid', gap: '16px' }}>
            <div className="master-card">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px',
                  background: '#eef5f1',
                  padding: '4px',
                  borderRadius: '14px',
                  marginBottom: '14px',
                }}
              >
                <button
                  type="button"
                  className={`master-chip ${activeSideTab === 'participants' ? 'active' : ''}`}
                  style={{ margin: 0, padding: '10px', border: 0, borderRadius: '10px' }}
                  onClick={() => setActiveSideTab('participants')}
                >
                  Participants ({cls.seatsTaken || 28})
                </button>
                <button
                  type="button"
                  className={`master-chip ${activeSideTab === 'chat' ? 'active' : ''}`}
                  style={{ margin: 0, padding: '10px', border: 0, borderRadius: '10px' }}
                  onClick={() => setActiveSideTab('chat')}
                >
                  Live Chat
                </button>
              </div>

              {activeSideTab === 'participants' ? (
                <div>
                  <input
                    className="master-input"
                    placeholder="⌕  Search participants..."
                    style={{ marginBottom: '12px', padding: '10px 14px' }}
                  />
                  {['Rohan', 'Priya', 'Aman', 'Sneha', 'Karan'].map((name) => (
                    <div
                      key={name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 0',
                        borderBottom: '1px solid #edf2ef',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: 'linear-gradient(145deg, #ede5fc, #ded0f7)',
                            border: '1px solid var(--border)',
                            display: 'grid',
                            placeItems: 'center',
                            fontWeight: 800,
                            color: 'var(--master-green-dark)',
                          }}
                        >
                          {name[0]}
                        </div>
                        <div>
                          <b style={{ fontSize: '14px' }}>{name}</b>
                          <small style={{ display: 'block', color: 'var(--master-muted)' }}>Student</small>
                        </div>
                      </div>
                      <span style={{ color: '#e94e5b', fontSize: '15px' }}>♩</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gap: '10px', maxHeight: '260px', overflowY: 'auto', marginBottom: '12px' }}>
                    {chatMessages.map((m, i) => (
                      <div key={i} style={{ background: '#f0f6f3', borderRadius: '14px', padding: '10px 12px' }}>
                        <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--master-green-dark)' }}>
                          {m.sender}
                        </div>
                        <div style={{ fontSize: '14px', color: '#334155', marginTop: '2px' }}>{m.text}</div>
                        <small style={{ color: '#8992a0', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                          {m.time}
                        </small>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
                    <input
                      className="master-input"
                      value={inputMsg}
                      onChange={(e) => setInputMsg(e.target.value)}
                      placeholder="Type a message..."
                      style={{ padding: '10px 12px' }}
                    />
                    <button type="submit" className="master-btn-primary" style={{ padding: '10px 16px' }}>
                      ➤
                    </button>
                  </form>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Live Banner */}
        <section className="master-bottom-banner">
          <div className="master-banner-icon">🌱</div>
          <div>
            <strong>You're helping students grow</strong>
            <p>Every session creates new opportunities.</p>
          </div>
        </section>
      </div>
    )
  }

  // Scheduled / Recorded Class View
  return (
    <div className="master-container">
      <button
        type="button"
        className="master-chip"
        style={{ marginBottom: '16px' }}
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <div className="master-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--master-muted)', letterSpacing: '0.8px' }}>
            {skillLabel(cls.skill)?.toUpperCase() ?? 'LIVE LECTURE'}
          </span>
          <LiveStatusPill status={cls.status} />
        </div>
        <h1>{cls.title}</h1>
        <p className="master-lead">
          Mentored by <strong>{cls.mentor.name}</strong>
          {cls.mentor.headline ? ` · ${cls.mentor.headline}` : ''}
        </p>
      </div>

      <div className="master-2col">
        {/* Left Column: Player or Status */}
        <div>
          {showRecording ? (
            <div style={{ marginBottom: '24px' }}>
              <RecordingPlayer cls={cls} onProgress={(s) => progress.mutate(s)} />

              <div className="master-card" style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: watchedPct > 0 ? '12px' : 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--master-muted)' }}>
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
                  <div className="master-progress-bar" style={{ margin: 0 }}>
                    <div className="master-progress-bar-fill" style={{ width: `${watchedPct}%` }} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <article className="master-card">
              <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 16px' }}>Session overview</h3>
              <div style={{ display: 'grid', gap: '12px', fontSize: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--master-muted)' }}>Scheduled for</span>
                  <strong>{formatDateTime(cls.scheduledAt)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--master-muted)' }}>Starts in</span>
                  <strong>{formatRelative(cls.scheduledAt)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--master-muted)' }}>Duration</span>
                  <strong>{cls.durationMinutes} minutes</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--master-muted)' }}>Seats reserved</span>
                  <strong>{cls.seatsTaken} / {cls.capacity}</strong>
                </div>
              </div>

              <div className="master-progress-bar" style={{ marginTop: '16px' }}>
                <div
                  className="master-progress-bar-fill"
                  style={{ width: `${Math.min(100, (cls.seatsTaken / cls.capacity) * 100)}%` }}
                />
              </div>

              {cls.description && (
                <div style={{ marginTop: '18px', borderTop: '1px solid #eef3f0', paddingTop: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--master-muted)', marginBottom: '6px' }}>
                    WHAT THIS COVERS
                  </div>
                  <p style={{ margin: 0, color: '#455365', lineHeight: 1.45 }}>{cls.description}</p>
                </div>
              )}
            </article>
          )}

          <ErrorNote error={register.error ?? unregister.error ?? join.error} />

          {/* Registration / Join Actions */}
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
            <button
              type="button"
              className="master-btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '16px' }}
              disabled={register.isPending || cls.isFull}
              onClick={() => register.mutate()}
            >
              {cls.isFull ? 'Class is full' : register.isPending ? 'Registering…' : 'Register for this lecture'}
            </button>
          ) : cls.canJoin ? (
            <button
              type="button"
              className="master-btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '16px' }}
              disabled={join.isPending}
              onClick={() => join.mutate()}
            >
              {join.isPending ? 'Opening…' : 'Join the room →'}
            </button>
          ) : (
            <div>
              <button
                type="button"
                className="master-chip"
                style={{ width: '100%', padding: '14px', marginBottom: '8px' }}
                disabled
              >
                {cls.joinBlockedReason ?? 'Not open yet'}
              </button>
              {cls.status === 'scheduled' && (
                <button
                  type="button"
                  className="master-chip"
                  style={{ width: '100%', padding: '14px' }}
                  disabled={unregister.isPending}
                  onClick={() => unregister.mutate()}
                >
                  {unregister.isPending ? 'Cancelling…' : 'Give up my seat'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Details & Checklist */}
        <aside style={{ display: 'grid', gap: '20px' }}>
          <div className="master-card">
            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 14px' }}>Class details</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              <Pill>{LANGUAGE_LABELS[cls.language]}</Pill>
              <Pill>{cls.durationMinutes} min</Pill>
              {cls.attendedAt && <Pill tone="ok">You attended</Pill>}
              {cls.hasRecording && <Pill tone="brand">Recording available</Pill>}
            </div>
            <p style={{ color: 'var(--master-muted)', fontSize: '14px', lineHeight: 1.45, margin: 0 }}>
              Live group lectures help you build placement skills, practice interactive group discussions, and receive direct mentor guidance.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
