import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { Card, Empty, ErrorNote, Loading, Pill, StatusPill } from '../../components/ui'

/**
 * This week's tasks.
 *
 * Lifted out of HomePage unchanged — same `['my-week']` query, same ordering
 * (not started, then waiting on a mentor, then reviewed). Each card now also
 * carries its lesson link, so the assignment is never a dead end in either
 * direction: the video that set it, and the feedback it earned.
 */

interface WeekAssignment {
  id: string
  title: string
  brief: string
  maxDurationSeconds: number
  lesson: { id: string; title: string }
  track: string
  status: string
  submissionId: string | null
  hasFeedback: boolean
}

export default function AssignmentsPage() {
  const navigate = useNavigate()

  const week = useQuery({
    queryKey: ['my-week'],
    queryFn: () => api.get<{ assignments: WeekAssignment[] }>('/curriculum/my-week'),
  })

  const all = week.data?.assignments ?? []
  const pending = all.filter((a) => a.status === 'not_started')
  const awaiting = all.filter((a) => ['submitted', 'in_review'].includes(a.status))
  const done = all.filter((a) => a.status === 'reviewed')

  return (
    <div className="stack">
      <div>
        <Link to="/" className="back-link">
          ← Home
        </Link>
        <h1>This week</h1>
        <p className="small">
          {pending.length > 0
            ? `${pending.length} task${pending.length > 1 ? 's' : ''} waiting for you.`
            : awaiting.length > 0
              ? 'Your mentor is reviewing your work.'
              : 'All caught up. Watch a lesson and get ahead.'}
        </p>
      </div>

      <ErrorNote error={week.error} />

      {week.isLoading ? (
        <Loading rows={2} />
      ) : all.length === 0 ? (
        <Empty icon="◎" title="No tasks yet" body="Your college is still setting up the track." />
      ) : (
        <div className="stack">
          {[...pending, ...awaiting, ...done].map((a) => (
            <Card key={a.id} accent={a.status === 'not_started'}>
              <div className="row-between" style={{ marginBottom: '0.4rem' }}>
                <span className="tiny faint">{a.track}</span>
                <StatusPill status={a.status} />
              </div>
              <div className="strong">{a.title}</div>
              <div className="small" style={{ marginTop: '0.25rem' }}>
                {a.brief}
              </div>
              <div className="row" style={{ marginTop: '0.6rem' }}>
                <Pill>{Math.round(a.maxDurationSeconds / 60)} min max</Pill>
              </div>

              {/* Three ways out of one card: the video it came from, the recorder,
                  and the feedback if a mentor has written any. */}
              <div className="link-row">
                <Link to={`/lessons/${a.lesson.id}`} className="link-chip">
                  ▶ Watch the lesson
                </Link>
                <button
                  type="button"
                  className="link-chip"
                  onClick={() => navigate(`/assignments/${a.id}/record`)}
                >
                  {a.status === 'not_started' ? '● Record my answer' : '● Record again'}
                </button>
                {a.hasFeedback && (
                  <Link to="/feedback" className="link-chip link-chip-ok">
                    ✎ See feedback
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
