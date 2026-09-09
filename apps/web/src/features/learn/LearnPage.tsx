import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import {
  Card,
  Empty,
  ErrorNote,
  Loading,
  Pill,
  StatusPill,
  formatDateTime,
  formatRelative,
} from '../../components/ui'
import type { LiveClassView } from '../live/LiveBits'

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

  /**
   * The next lecture the student is actually signed up for. Shared cache key with
   * the pet companion, which asks the same question.
   */
  const nextLive = useQuery({
    queryKey: ['live-next'],
    queryFn: () => api.get<{ class: LiveClassView | null }>('/live/next'),
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

      {/* A lecture in progress outranks everything else on this page — it is the
          one thing that stops being available if the student scrolls past it. */}
      {nextLive.data?.class && (
        <Card
          accent={nextLive.data.class.status === 'live'}
          onClick={() => navigate(`/live/${nextLive.data!.class!.id}`)}
        >
          <div className="row-between">
            <div>
              <div className="tiny faint">
                {nextLive.data.class.status === 'live' ? 'LIVE RIGHT NOW' : 'YOUR NEXT LIVE LECTURE'}
              </div>
              <div className="strong">{nextLive.data.class.title}</div>
              <div className="tiny dim">
                {nextLive.data.class.mentor.name} ·{' '}
                {nextLive.data.class.status === 'live'
                  ? 'under way'
                  : `${formatDateTime(nextLive.data.class.scheduledAt)} (${formatRelative(nextLive.data.class.scheduledAt)})`}
              </div>
            </div>
            {nextLive.data.class.status === 'live' ? (
              <span className="pill pill-danger">
                <span className="rec-dot" />
                Join
              </span>
            ) : (
              <Pill tone="brand">Details →</Pill>
            )}
          </div>
        </Card>
      )}

      {mentor.data && !mentor.data.mentor && (
        <Card accent onClick={() => navigate('/mentor/browse')}>
          <div className="strong">You don't have a mentor yet</div>
          <div className="small">Pick one from the pool — it takes a minute.</div>
        </Card>
      )}

      {/* All three queries, not just the week: a failed tracks or mentor call used
          to render as a bare heading over an empty div with nothing explaining why. */}
      <ErrorNote error={week.error ?? mentor.error} />

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

      {/* Sits between the week's work and the lessons on purpose: it is neither
          an obligation nor a video, it is the thing to do in two spare minutes.
          Also the only non-pet way to find /practice — there is no nav tab. */}
      <Card onClick={() => navigate('/practice')}>
        <div className="row-between">
          <div>
            <div className="tiny faint">TWO-MINUTE DRILL</div>
            <div className="strong">Practise a word out loud</div>
            <div className="tiny dim">
              Read a word, find out which syllable slipped. Not scored, not seen by anyone.
            </div>
          </div>
          <Pill tone="brand">♪ Start</Pill>
        </div>
      </Card>

      <div className="section-title">Lessons</div>
      {tracks.isLoading ? (
        <Loading rows={2} />
      ) : tracks.error ? (
        <ErrorNote error={tracks.error} />
      ) : tracks.data?.tracks.length === 0 ? (
        <Empty icon="▤" title="No lessons yet" body="Your college is still setting up the curriculum." />
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
