import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Card, Empty, ErrorNote, Loading, Meter, formatDate } from '../../components/ui'

interface FeedbackItem {
  id: string
  at: string
  mentor: string
  assignment: string
  submissionId: string
  playbackUrl: string | null
  rubric: Array<{ key: string; label: string; max: number }>
  rubricScores: Record<string, number>
  freeform: string
  strengths: string | null
  nextStep: string | null
}

export default function FeedbackListPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-feedback'],
    queryFn: () => api.get<{ feedback: FeedbackItem[] }>('/feedback/mine'),
  })

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
        items.map((f) => (
          <Card key={f.id}>
            <div className="row-between" style={{ marginBottom: '0.5rem' }}>
              <div>
                <div className="strong small">{f.assignment}</div>
                <div className="tiny faint">
                  {f.mentor} · {formatDate(f.at)}
                </div>
              </div>
            </div>

            {f.playbackUrl && (
              <video
                className="video-frame video-frame-wide"
                style={{ maxHeight: '34vh', marginBottom: '0.75rem' }}
                src={f.playbackUrl}
                controls
                playsInline
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
          </Card>
        ))
      )}
    </div>
  )
}
