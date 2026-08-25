import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Card, Empty, ErrorNote, Loading, Pill, StatusPill } from '../../components/ui'

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

interface TrackTree {
  id: string
  slug: string
  title: string
  description: string | null
  modules: Array<{
    id: string
    title: string
    summary: string | null
    lessons: Array<{
      id: string
      title: string
      summary: string | null
      durationSeconds: number | null
      availableLanguages: string[]
      assignmentCount: number
      playbackUrl: string | null
    }>
  }>
}

export default function LearnPage() {
  const { me, language } = useAuth()
  const navigate = useNavigate()

  const week = useQuery({
    queryKey: ['my-week'],
    queryFn: () => api.get<{ assignments: WeekAssignment[] }>('/curriculum/my-week'),
  })

  const tracks = useQuery({
    queryKey: ['tracks', language],
    queryFn: () => api.get<{ tracks: TrackTree[] }>(`/curriculum/tracks?language=${language}`),
  })

  const mentor = useQuery({
    queryKey: ['my-mentor'],
    queryFn: () =>
      api.get<{ mentor: { id: string; name: string; headline: string | null } | null }>(
        '/mentorship/me',
      ),
  })

  const pending = week.data?.assignments.filter((a) => a.status === 'not_started') ?? []
  const awaiting = week.data?.assignments.filter((a) => ['submitted', 'in_review'].includes(a.status)) ?? []
  const done = week.data?.assignments.filter((a) => a.status === 'reviewed') ?? []

  return (
    <div className="stack">
      <div>
        <h1>Namaste, {me?.name?.split(' ')[0]}</h1>
        <p className="small">
          {pending.length > 0
            ? `${pending.length} task${pending.length > 1 ? 's' : ''} waiting for you this week.`
            : awaiting.length > 0
              ? 'Your mentor is reviewing your work.'
              : 'All caught up. Watch a lesson and get ahead.'}
        </p>
      </div>

      {mentor.data?.mentor && (
        <Card onClick={() => navigate('/mentor')}>
          <div className="row-between">
            <div>
              <div className="tiny faint">YOUR MENTOR</div>
              <div className="strong">{mentor.data.mentor.name}</div>
              {mentor.data.mentor.headline && (
                <div className="tiny dim">{mentor.data.mentor.headline}</div>
              )}
            </div>
            <Pill tone="brand">Switch →</Pill>
          </div>
        </Card>
      )}

      {mentor.data && !mentor.data.mentor && (
        <Card accent onClick={() => navigate('/mentor/browse')}>
          <div className="strong">You don't have a mentor yet</div>
          <div className="small">Pick one from the pool — it takes a minute.</div>
        </Card>
      )}

      <ErrorNote error={week.error} />

      <div className="section-title">This week</div>
      {week.isLoading ? (
        <Loading rows={2} />
      ) : week.data?.assignments.length === 0 ? (
        <Empty icon="◎" title="No tasks yet" body="Your college is still setting up the track." />
      ) : (
        <div className="stack">
          {[...pending, ...awaiting, ...done].map((a) => (
            <Card
              key={a.id}
              accent={a.status === 'not_started'}
              onClick={() =>
                a.hasFeedback
                  ? navigate('/feedback')
                  : a.status === 'not_started'
                    ? navigate(`/assignments/${a.id}/record`)
                    : navigate(`/lessons/${a.lesson.id}`)
              }
            >
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
                {a.hasFeedback && <Pill tone="ok">Feedback ready</Pill>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="section-title">Lessons</div>
      {tracks.isLoading ? (
        <Loading rows={2} />
      ) : (
        <div className="stack">
          {tracks.data?.tracks.map((t) => (
            <div key={t.id} className="stack-sm">
              {t.modules.map((m) => (
                <div key={m.id}>
                  <div className="tiny faint" style={{ margin: '0.5rem 0 0.35rem' }}>
                    {m.title.toUpperCase()}
                  </div>
                  <div className="stack-sm">
                    {m.lessons.map((l) => (
                      <Link
                        key={l.id}
                        to={`/lessons/${l.id}`}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <div className="card card-tight card-interactive">
                          <div className="row-between">
                            <div>
                              <div className="strong small">{l.title}</div>
                              <div className="tiny faint">
                                {l.durationSeconds ? `${Math.round(l.durationSeconds / 60)} min` : 'Video'}
                                {l.assignmentCount > 0 && ` · ${l.assignmentCount} task`}
                              </div>
                            </div>
                            {l.availableLanguages.includes(language) ? (
                              <Pill tone="brand">{language.toUpperCase()}</Pill>
                            ) : (
                              <Pill>EN</Pill>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
