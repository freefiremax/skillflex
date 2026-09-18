import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { Empty, ErrorNote, Loading, PlaybackVideo, formatDate } from '../../components/ui'

interface FeedbackItem {
  id: string
  at: string
  mentor: string
  assignment: string
  assignmentId: string
  lesson: { id: string; title: string }
  submissionId: string
  playbackUrl: string | null
  rubric: Array<{ key: string; label: string; max: number }>
  rubricScores: Record<string, number>
  freeform: string
  strengths: string | null
  nextStep: string | null
}

export default function FeedbackListPage() {
  const [params] = useSearchParams()
  const focusId = params.get('item')
  const focusRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-feedback'],
    queryFn: () => api.get<{ feedback: FeedbackItem[] }>('/feedback/mine'),
  })

  useEffect(() => {
    if (!focusId || !data) return
    focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focusId, data])

  if (isLoading) return <Loading rows={3} />
  if (error) return <ErrorNote error={error} />

  const items = data?.feedback ?? []

  return (
    <div className="master-container">
      {/* Header from SkillFlex_Master */}
      <div className="master-header">
        <h1 style={{ fontSize: 'clamp(36px, 4.5vw, 54px)', letterSpacing: '-2px', margin: '0 0 10px', fontWeight: 850 }}>
          Your feedback
        </h1>
        <p className="master-lead" style={{ fontSize: '17px', color: '#59677b' }}>
          Written by a person who watched your video. Kept forever, even if you switch mentors.
        </p>
      </div>

      {/* Note & Overall Score Pill from SkillFlex_Master */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            fontFamily: '"Comic Sans MS", "Segoe Print", cursive',
            fontSize: '18px',
            lineHeight: 1.2,
            transform: 'rotate(-2deg)',
            color: '#153451',
          }}
        >
          Real feedback<br />helps you grow.
          <span style={{ color: 'var(--master-green)', display: 'block', fontSize: '24px', lineHeight: 0.2 }}>⌁</span>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.95)',
            borderRadius: '18px',
            padding: '10px 16px',
            textAlign: 'center',
            boxShadow: 'var(--shadow)',
          }}
        >
          <b style={{ fontSize: '22px', display: 'block', color: 'var(--master-green-dark)' }}>4.0</b>
          <span style={{ fontSize: '11px', color: 'var(--master-muted)', fontWeight: 600 }}>overall</span>
        </div>
      </div>

      {items.length === 0 ? (
        <Empty
          icon="✎"
          title="No feedback yet"
          body="Once you send a recording, your mentor's notes and score breakdown will land here."
        />
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {items.map((f) => {
            const focused = f.id === focusId
            return (
              <article
                key={f.id}
                ref={focused ? focusRef : undefined}
                className="master-card"
                style={{
                  borderColor: focused ? 'var(--master-green)' : undefined,
                  boxShadow: focused ? '0 0 0 2px var(--master-green)' : undefined,
                  padding: '22px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    marginBottom: '14px',
                  }}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'linear-gradient(145deg, #ede5fc, #ded0f7)',
                      border: '1px solid var(--border)',
                      color: 'var(--master-green-dark)',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 800,
                      fontSize: '18px',
                      flexShrink: 0,
                    }}
                  >
                    {f.mentor.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 3px' }}>
                      {f.assignment}
                    </h2>
                    <div style={{ fontSize: '13px', color: 'var(--master-muted)' }}>
                      {f.mentor} · {formatDate(f.at)}
                    </div>
                  </div>
                  <span style={{ marginLeft: 'auto', color: '#657084', fontSize: '20px' }}>⋮</span>
                </div>

                {/* Real Video Preview Image from SkillFlex_Master */}
                <div
                  style={{
                    borderRadius: '18px',
                    overflow: 'hidden',
                    position: 'relative',
                    background: '#1a222a',
                    marginBottom: '16px',
                  }}
                >
                  {f.playbackUrl ? (
                    <PlaybackVideo
                      className="video-frame video-frame-wide"
                      style={{ maxHeight: '320px' }}
                      src={f.playbackUrl}
                      missingTitle="Recording unavailable"
                      missingBody="Your mentor's notes below are unaffected."
                    />
                  ) : (
                    <>
                      <img
                        src="/assets/real/feedback-video.jpg"
                        alt="Recorded feedback video"
                        style={{ width: '100%', height: '240px', objectFit: 'cover', display: 'block' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 'auto 0 0',
                          height: '58px',
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                        }}
                      />
                      <button
                        type="button"
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          border: 0,
                          background: 'rgba(255, 255, 255, 0.92)',
                          color: '#152239',
                          fontSize: '22px',
                          cursor: 'pointer',
                          display: 'grid',
                          placeItems: 'center',
                          boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                        }}
                      >
                        ▶
                      </button>
                      <div
                        style={{
                          position: 'absolute',
                          left: '12px',
                          bottom: '10px',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        0:00 / 0:04
                      </div>
                    </>
                  )}
                </div>

                {/* Rubric Progress Bars */}
                {f.rubric.length > 0 && (
                  <div style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
                    {f.rubric.map((c) => {
                      const score = f.rubricScores[c.key]
                      if (typeof score !== 'number') return null
                      const pct = Math.min(100, Math.round((score / c.max) * 100))
                      return (
                        <div
                          key={c.key}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '140px 1fr 36px',
                            gap: '10px',
                            alignItems: 'center',
                          }}
                        >
                          <span style={{ fontSize: '14px', color: '#546274', fontWeight: 600 }}>{c.label}</span>
                          <div style={{ height: '8px', background: '#e5ebea', borderRadius: '8px', overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                background: 'linear-gradient(90deg, var(--cta-from), var(--cta-to))',
                                borderRadius: '8px',
                                width: `${pct}%`,
                              }}
                            />
                          </div>
                          <span style={{ textAlign: 'right', fontWeight: 800, fontSize: '13px' }}>
                            {score}/{c.max}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Comment quote block */}
                <div
                  style={{
                    margin: '12px 0 10px',
                    padding: '14px 16px',
                    borderRadius: '15px',
                    background: '#f1ebfa',
                    borderLeft: '4px solid var(--master-green-dark)',
                  }}
                >
                  <small
                    style={{
                      display: 'block',
                      color: '#6a7688',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                      fontWeight: 800,
                      marginBottom: '4px',
                    }}
                  >
                    {f.mentor.toUpperCase()} WROTE
                  </small>
                  <p style={{ margin: 0, fontSize: '15px', color: '#1a283c' }}>“{f.freeform}”</p>
                </div>

                {f.nextStep && (
                  <div style={{ fontSize: '15px', margin: '12px 0 16px' }}>
                    <b style={{ color: 'var(--master-green-dark)' }}>Next step: </b>
                    <span>{f.nextStep}</span>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <Link
                    to={`/lessons/${f.lesson.id}`}
                    style={{
                      height: '44px',
                      borderRadius: '14px',
                      border: '1px solid var(--border)',
                      background: '#fff',
                      color: 'var(--master-ink)',
                      fontWeight: 700,
                      fontSize: '13px',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    ▶ Watch the lesson
                  </Link>
                  <Link
                    to={`/assignments/${f.assignmentId}/record`}
                    style={{
                      height: '44px',
                      borderRadius: '14px',
                      border: '1px solid var(--master-green)',
                      background: 'var(--master-green)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '13px',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    □ Open assignment
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Banner from SkillFlex_Master */}
      <section
        style={{
          marginTop: '18px',
          padding: '16px 20px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #ffffff 0%, #faf7fe 45%, #f2eafc 100%)',
          border: '1px solid rgba(139, 92, 246, 0.18)',
          boxShadow: '0 4px 20px rgba(124, 58, 237, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <div style={{ fontSize: '32px' }}>🌱</div>
        <div>
          <strong style={{ display: 'block', fontSize: '16px' }}>Keep going!</strong>
          <span style={{ display: 'block', color: '#627087', fontSize: '13px', marginTop: '2px' }}>
            Feedback helps you get better, one step at a time.
          </span>
        </div>
      </section>
    </div>
  )
}
