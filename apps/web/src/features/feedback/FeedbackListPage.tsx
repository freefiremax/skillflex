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
      {/* Master Hero */}
      <section className="master-hero">
        <div className="master-hero-copy">
          <h1>Your feedback</h1>
          <p>
            Written by a person who watched your video. Kept forever, even if you switch mentors.
          </p>
          <div className="master-hero-features">
            <div className="master-feature-item">
              <span className="master-feature-icon">●●●</span>
              <div>Real human<br />feedback</div>
            </div>
            <div className="master-feature-item">
              <span className="master-feature-icon">▮▮▮</span>
              <div>Track your<br />progress</div>
            </div>
            <div className="master-feature-item">
              <span className="master-feature-icon">✓</span>
              <div>Honest &<br />actionable</div>
            </div>
          </div>
        </div>
        <div className="master-hero-art-wrapper">
          <img
            className="master-hero-art"
            src="/assets/master/feedback/feedback-hero.png"
            alt="Student receiving mentor feedback"
          />
        </div>
      </section>

      {items.length === 0 ? (
        <Empty
          icon="✎"
          title="No feedback yet"
          body="Once you send a recording, your mentor's notes and score breakdown will land here."
        />
      ) : (
        <div className="master-2col">
          {/* Main Feed Column */}
          <div>
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
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px',
                      marginBottom: '16px',
                    }}
                  >
                    <div>
                      <h2 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 800 }}>
                        {f.assignment}
                      </h2>
                      <div style={{ color: 'var(--master-muted)', fontSize: '15px' }}>
                        {f.mentor} · {formatDate(f.at)}
                      </div>
                    </div>
                    <div
                      style={{
                        background: '#e7f7ef',
                        color: 'var(--master-green-dark)',
                        padding: '8px 14px',
                        borderRadius: '14px',
                        fontWeight: 700,
                        fontSize: '14px',
                      }}
                    >
                      {f.lesson.title || 'Placement Track'}
                    </div>
                  </div>

                  {/* Video / Preview */}
                  <div
                    style={{
                      borderRadius: '20px',
                      overflow: 'hidden',
                      position: 'relative',
                      background: '#101820',
                      marginBottom: '20px',
                    }}
                  >
                    {f.playbackUrl ? (
                      <PlaybackVideo
                        className="video-frame video-frame-wide"
                        style={{ maxHeight: '340px' }}
                        src={f.playbackUrl}
                        missingTitle="Recording unavailable"
                        missingBody="Your mentor's notes below are unaffected."
                      />
                    ) : (
                      <img
                        src="/assets/master/feedback/feedback-video.png"
                        alt="Speaking practice preview"
                        style={{ width: '100%', height: '280px', objectFit: 'cover', display: 'block' }}
                      />
                    )}
                  </div>

                  {/* Rubric Score Meters */}
                  {f.rubric.length > 0 && (
                    <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
                      {f.rubric.map((c) => {
                        const score = f.rubricScores[c.key]
                        if (typeof score !== 'number') return null
                        const pct = Math.min(100, Math.round((score / c.max) * 100))
                        return (
                          <div key={c.key}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '15px',
                                fontWeight: 700,
                                color: '#435269',
                                marginBottom: '6px',
                              }}
                            >
                              <span>{c.label}</span>
                              <span style={{ color: 'var(--master-ink)' }}>{score}/{c.max}</span>
                            </div>
                            <div className="master-progress-bar" style={{ height: '10px', margin: 0 }}>
                              <div className="master-progress-bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Human Mentor Note */}
                  <div
                    style={{
                      padding: '18px 20px',
                      borderLeft: '5px solid var(--master-green)',
                      borderRadius: '16px',
                      background: '#f5faf7',
                      marginBottom: '16px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        color: 'var(--master-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        fontWeight: 800,
                        marginBottom: '6px',
                      }}
                    >
                      {f.mentor.toUpperCase()} WROTE
                    </div>
                    <p style={{ margin: 0, fontSize: '17px', lineHeight: 1.45, color: '#1f2d42' }}>
                      “{f.freeform}”
                    </p>
                  </div>

                  {f.strengths && (
                    <div style={{ fontSize: '15px', marginBottom: '10px', color: '#425167' }}>
                      <b style={{ color: 'var(--master-green-dark)' }}>Working well: </b>
                      {f.strengths}
                    </div>
                  )}

                  {f.nextStep && (
                    <div style={{ fontSize: '16px', marginBottom: '18px', color: '#1f2d42' }}>
                      <b style={{ color: 'var(--master-green)' }}>Next step: </b>
                      {f.nextStep}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <Link
                      to={`/lessons/${f.lesson.id}`}
                      style={{
                        padding: '11px 18px',
                        borderRadius: '14px',
                        border: '1px solid #cfe2da',
                        background: '#fff',
                        fontSize: '15px',
                        fontWeight: 700,
                        color: '#27364b',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      ▶ Watch the lesson
                    </Link>
                    <Link
                      to={`/assignments/${f.assignmentId}/record`}
                      style={{
                        padding: '11px 18px',
                        borderRadius: '14px',
                        border: '1px solid var(--master-green)',
                        background: 'var(--master-green)',
                        color: '#fff',
                        fontSize: '15px',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      ▤ Open the assignment
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>

          {/* Sidebar */}
          <aside>
            <div className="master-card">
              <img
                src="/assets/master/feedback/feedback-side.png"
                alt="Encouraging feedback illustration"
                style={{ width: '100%', height: '240px', objectFit: 'cover', borderRadius: '20px' }}
              />
              <h3 style={{ fontSize: '22px', margin: '16px 0 6px', fontWeight: 800 }}>
                Keep going!
              </h3>
              <p style={{ color: 'var(--master-muted)', fontSize: '16px', lineHeight: 1.45, margin: 0 }}>
                You're improving. Every feedback brings you closer to your placement readiness goal.
              </p>

              {/* Status Timeline */}
              <div className="master-timeline">
                <div className="master-timeline-step done">
                  <div className="master-timeline-dot">✓</div>
                  <div>
                    <strong style={{ fontSize: '15px', display: 'block' }}>Video submitted</strong>
                    <small style={{ color: 'var(--master-muted)' }}>Captured and sent</small>
                  </div>
                  <i className="master-timeline-line" />
                </div>
                <div className="master-timeline-step done">
                  <div className="master-timeline-dot">✓</div>
                  <div>
                    <strong style={{ fontSize: '15px', display: 'block' }}>Reviewed by mentor</strong>
                    <small style={{ color: 'var(--master-muted)' }}>Detailed evaluation</small>
                  </div>
                  <i className="master-timeline-line" />
                </div>
                <div className="master-timeline-step done">
                  <div className="master-timeline-dot">✓</div>
                  <div>
                    <strong style={{ fontSize: '15px', display: 'block' }}>Feedback received</strong>
                    <small style={{ color: 'var(--master-muted)' }}>Scores & guidance</small>
                  </div>
                  <i className="master-timeline-line" />
                </div>
                <div className="master-timeline-step">
                  <div className="master-timeline-dot" style={{ background: '#fff' }} />
                  <div>
                    <strong style={{ fontSize: '15px', display: 'block' }}>Next step in progress</strong>
                    <small style={{ color: 'var(--master-muted)' }}>Keep practising!</small>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Bottom Inspiration Banner */}
      <section className="master-bottom-banner">
        <div className="master-banner-icon">◎</div>
        <div>
          <strong>Consistent feedback builds a confident you.</strong>
          <p>Practice, get feedback, improve — repeat!</p>
        </div>
      </section>
    </div>
  )
}
