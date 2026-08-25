import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { LANGUAGE_LABELS, SKILL_LABELS, type Language } from '@skillswitch/shared'
import { api } from '../../lib/api'
import { Card, Empty, ErrorNote, Loading, Pill, formatDate } from '../../components/ui'

interface MyMentor {
  since: string | null
  mentor: {
    id: string
    name: string
    headline: string | null
    bio: string | null
    languages: Language[]
    skills: string[]
  } | null
}

interface SwitchEvent {
  id: string
  at: string
  from: string | null
  to: string
  reasonCode: string
  reasonLabel: string
  note: string | null
}

export default function MentorPage() {
  const navigate = useNavigate()

  const mine = useQuery({
    queryKey: ['my-mentor'],
    queryFn: () => api.get<MyMentor>('/mentorship/me'),
  })

  const history = useQuery({
    queryKey: ['switch-history'],
    queryFn: () => api.get<{ events: SwitchEvent[] }>('/mentorship/history'),
  })

  if (mine.isLoading) return <Loading rows={3} />
  if (mine.error) return <ErrorNote error={mine.error} />

  const m = mine.data?.mentor
  const switches = (history.data?.events ?? []).filter((e) => e.reasonCode !== 'initial_assignment')

  return (
    <div className="stack">
      <h1>Your mentor</h1>

      {!m ? (
        <>
          <Empty icon="☺" title="No mentor assigned" body="Pick someone from the pool." />
          <button className="btn btn-primary btn-block" onClick={() => navigate('/mentor/browse')}>
            Browse mentors
          </button>
        </>
      ) : (
        <>
          <Card accent>
            <div className="strong" style={{ fontSize: '1.05rem' }}>{m.name}</div>
            {m.headline && <div className="small dim">{m.headline}</div>}
            {mine.data?.since && (
              <div className="tiny faint" style={{ marginTop: '0.2rem' }}>
                Your mentor since {formatDate(mine.data.since)}
              </div>
            )}

            {m.bio && (
              <p className="small" style={{ marginTop: '0.7rem', marginBottom: '0.7rem' }}>
                {m.bio}
              </p>
            )}

            <div className="row wrap" style={{ gap: '0.35rem', marginBottom: '0.4rem' }}>
              {m.languages.map((l) => (
                <Pill key={l} tone="brand">{LANGUAGE_LABELS[l]}</Pill>
              ))}
            </div>
            <div className="row wrap" style={{ gap: '0.35rem' }}>
              {m.skills.map((s) => (
                <Pill key={s}>{SKILL_LABELS[s as keyof typeof SKILL_LABELS] ?? s}</Pill>
              ))}
            </div>
          </Card>

          {/* The promise, stated where the user can act on it. This is the
              entire pitch: no repurchase, no losing your history. */}
          <Card>
            <div className="strong small">Not the right fit?</div>
            <p className="small" style={{ marginTop: '0.25rem' }}>
              Switch to a different mentor at no extra cost. You keep every piece of feedback
              you've already received.
            </p>
            <button className="btn btn-ghost btn-block" onClick={() => navigate('/mentor/browse')}>
              Switch mentor
            </button>
          </Card>
        </>
      )}

      {switches.length > 0 && (
        <>
          <div className="section-title">Your switches</div>
          <div className="stack-sm">
            {switches.map((e) => (
              <Card key={e.id} className="card-tight">
                <div className="row-between">
                  <span className="small">
                    {e.from ? `${e.from} → ` : ''}
                    <span className="strong">{e.to}</span>
                  </span>
                  <span className="tiny faint">{formatDate(e.at)}</span>
                </div>
                <div className="tiny dim" style={{ marginTop: '0.2rem' }}>{e.reasonLabel}</div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
