import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Empty, ErrorNote, Loading, Pill } from '../../components/ui'

/**
 * The whole curriculum, track by track. Lectures and nothing else.
 *
 * Lifted out of HomePage, which used to carry the greeting, the mentor card,
 * the next lecture, this week's tasks and six nav cards above it; on a phone the
 * lessons were four screens of scrolling away. It is now a bottom-nav tab.
 *
 * Deliberately says nothing about assignments — not the per-lesson task count,
 * not "then record your answer". This is the watch list. The task attached to a
 * lesson appears when you open that lesson, and the whole week's worth lives on
 * /assignments; announcing homework next to every title turned a video library
 * into a chore list.
 */

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
      playbackUrl: string | null
    }>
  }>
}

export default function LessonsPage() {
  const { language } = useAuth()

  const tracks = useQuery({
    queryKey: ['tracks', language],
    queryFn: () => api.get<{ tracks: TrackTree[] }>(`/curriculum/tracks?language=${language}`),
  })

  return (
    <div className="stack">
      <div>
        <h1>Lessons</h1>
        <p className="small">
          Every lecture, module by module. They play in{' '}
          {language === 'hi' ? 'Hindi where it exists, English otherwise' : 'English'} — change that
          on <Link to="/languages">Languages</Link>.
        </p>
      </div>

      {tracks.isLoading ? (
        <Loading rows={3} />
      ) : tracks.error ? (
        <ErrorNote error={tracks.error} />
      ) : tracks.data?.tracks.length === 0 ? (
        <Empty icon="▤" title="No lessons yet" body="Your college is still setting up the curriculum." />
      ) : (
        <div className="stack">
          {tracks.data?.tracks.map((t) => (
            <div key={t.id} className="stack-sm">
              <div className="section-title">{t.title}</div>
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
