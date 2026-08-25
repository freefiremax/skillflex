import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { LANGUAGE_LABELS, type Language } from '@skillswitch/shared'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Card, Empty, ErrorNote, Loading, Pill } from '../../components/ui'

interface LessonDetail {
  id: string
  title: string
  summary: string | null
  durationSeconds: number | null
  track: { id: string; title: string }
  module: { id: string; title: string }
  availableLanguages: Language[]
  playbackUrl: string | null
  assignments: Array<{
    id: string
    title: string
    brief: string
    maxDurationSeconds: number
    rubric: Array<{ key: string; label: string; max: number }>
  }>
}

export default function LessonPage() {
  const { id } = useParams<{ id: string }>()
  const { language, setLanguage } = useAuth()
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['lesson', id, language],
    queryFn: () => api.get<LessonDetail>(`/curriculum/lessons/${id}?language=${language}`),
    enabled: Boolean(id),
  })

  if (isLoading) return <Loading rows={3} />
  if (error) return <ErrorNote error={error} />
  if (!data) return null

  const hasThisLanguage = data.availableLanguages.includes(language)

  return (
    <div className="stack">
      <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div>
        <div className="tiny faint">{data.track.title} · {data.module.title}</div>
        <h1>{data.title}</h1>
        {data.summary && <p className="small">{data.summary}</p>}
      </div>

      {data.playbackUrl ? (
        <video className="video-frame video-frame-wide" src={data.playbackUrl} controls playsInline />
      ) : (
        <Card>
          <Empty
            icon="▶"
            title="Video coming soon"
            body="This lesson's recording hasn't been uploaded to this environment yet."
          />
        </Card>
      )}

      {/* Language availability is honest: we say which languages exist rather
          than silently serving English and calling it multilingual. */}
      <Card className="card-tight">
        <div className="row-between wrap">
          <span className="tiny faint">AVAILABLE IN</span>
          <div className="row wrap" style={{ gap: '0.35rem' }}>
            {data.availableLanguages.map((l) => (
              <button
                key={l}
                type="button"
                className={`btn btn-sm ${l === language ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setLanguage(l)}
              >
                {LANGUAGE_LABELS[l]}
              </button>
            ))}
          </div>
        </div>
        {!hasThisLanguage && (
          <div className="tiny warn" style={{ marginTop: '0.5rem', color: 'var(--warn)' }}>
            Not available in {LANGUAGE_LABELS[language]} yet — showing the closest version.
          </div>
        )}
      </Card>

      {data.assignments.length > 0 && (
        <>
          <div className="section-title">Your task</div>
          {data.assignments.map((a) => (
            <Card key={a.id} accent>
              <div className="strong">{a.title}</div>
              <p className="small" style={{ marginTop: '0.3rem' }}>{a.brief}</p>

              <div className="tiny faint" style={{ marginTop: '0.5rem', marginBottom: '0.35rem' }}>
                YOUR MENTOR WILL SCORE
              </div>
              <div className="row wrap" style={{ gap: '0.35rem', marginBottom: '0.9rem' }}>
                {a.rubric.map((c) => (
                  <Pill key={c.key}>{c.label} /{c.max}</Pill>
                ))}
              </div>

              <button
                className="btn btn-primary btn-block"
                onClick={() => navigate(`/assignments/${a.id}/record`)}
              >
                Record my answer
              </button>
            </Card>
          ))}
        </>
      )}
    </div>
  )
}
