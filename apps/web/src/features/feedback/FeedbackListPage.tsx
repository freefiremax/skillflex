import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { Card, Empty, ErrorNote, Loading, Meter, PlaybackVideo, formatDate } from '../../components/ui'

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

  /**
   * `?item=` is what a lesson's "See feedback" link carries. Without it that
   * link lands on a list of every review the student has ever had and leaves
   * them to find the right one — which is the same dead end, one page later.
   */
  useEffect(() => {
    if (!focusId || !data) return
    focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focusId, data])

  if (isLoading) return <Loading rows={3} />
  if (error) return <ErrorNote error={error} />

  const items = data?.feedback ?? []

  return (
    <div className="stack">
      <div>
        <h1>Your feedback</h1>
        <p className="small">
          Written by a person who watched your video. Kept forever, even if you switch mentors.
        </p>
      </div>

      {items.length === 0 ? (
        <Empty
          icon="✎"
          title="No feedback yet"
          body="Once you send a recording, your mentor's notes land here."
        />
      ) : (
        items.map((f) => {
          const focused = f.id === focusId
          return (
            <div key={f.id} ref={focused ? focusRef : undefined}>
              <Card className={focused ? 'card-focused' : undefined}>
                <div className="row-between" style={{ marginBottom: '0.5rem' }}>
                  <div>
                    <div className="strong small">{f.assignment}</div>
                    <div className="tiny faint">
                      {f.mentor} · {formatDate(f.at)}
                    </div>
                  </div>
                </div>

                {f.playbackUrl && (
                  <PlaybackVideo
                    className="video-frame video-frame-wide"
                    style={{ maxHeight: '34vh', marginBottom: '0.75rem' }}
                    src={f.playbackUrl}
                    missingTitle="Recording unavailable"
                    missingBody="Your mentor's notes below are unaffected."
                  />
                )}

                {/* Scores: the structured half. */}
                {f.rubric.length > 0 && (
                  <div className="stack-sm" style={{ marginBottom: '0.85rem' }}>
                    {f.rubric.map((c) => {
                      const score = f.rubricScores[c.key]
                      if (typeof score !== 'number') return null
                      return (
                        <div key={c.key}>
                          <div className="row-between tiny" style={{ marginBottom: 3 }}>
                            <span className="dim">{c.label}</span>
                            <span className="mono strong">
                              {score}/{c.max}
                            </span>
                          </div>
                          <Meter value={score} max={c.max} />
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* The human half, visually marked as human. */}
                <div className="human-note" style={{ marginBottom: '0.6rem' }}>
                  <div className="tiny faint" style={{ marginBottom: '0.25rem' }}>
                    {f.mentor.toUpperCase()} WROTE
                  </div>
                  <div className="small" style={{ color: 'var(--text)' }}>
                    {f.freeform}
                  </div>
                </div>

                {f.strengths && (
                  <div className="small" style={{ marginBottom: '0.4rem' }}>
                    <span className="strong" style={{ color: 'var(--ok)' }}>Working well: </span>
                    <span className="dim">{f.strengths}</span>
                  </div>
                )}

                {f.nextStep && (
                  <div className="small">
                    <span className="strong" style={{ color: 'var(--accent)' }}>Next step: </span>
                    <span className="dim">{f.nextStep}</span>
                  </div>
                )}

                {/* Back up the chain. "Watch it again, then try the next step" is
                    the actual instruction in most of these notes, so the video
                    and the recorder belong on the card that gives it. */}
                <div className="link-row">
                  <Link to={`/lessons/${f.lesson.id}`} className="link-chip">
                    ▶ Watch the lesson
                  </Link>
                  <Link to={`/assignments/${f.assignmentId}/record`} className="link-chip">
                    ● Open the assignment
                  </Link>
                </div>
              </Card>
            </div>
          )
        })
      )}
    </div>
  )
}
