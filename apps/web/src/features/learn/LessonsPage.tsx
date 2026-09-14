import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { LANGUAGE_LABELS } from '@skillflex/shared'
import { api } from '../../lib/api'
import { useTranslation } from '../../lib/i18n'
import { Empty, ErrorNote, Loading } from '../../components/ui'

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

const LESSON_ART_SAMPLES = [
  '/assets/master/lessons/intro-student.png',
  '/assets/master/lessons/gd-group.png',
  '/assets/master/lessons/study-student.png',
]

export default function LessonsPage() {
  const { language, t } = useTranslation()

  const tracks = useQuery({
    queryKey: ['tracks', language],
    queryFn: () => api.get<{ tracks: TrackTree[] }>(`/curriculum/tracks?language=${language}`),
  })

  return (
    <div className="master-container">
      <div className="master-header">
        <h1>{t('lessons.title')}</h1>
        <p className="master-lead">
          Every lecture, module by module. Active language:{' '}
          <strong>{LANGUAGE_LABELS[language]}</strong> — change that on{' '}
          <Link to="/languages" style={{ color: 'inherit', textDecoration: 'underline' }}>
            Languages
          </Link>
          .
        </p>
      </div>

      {/* Master Hero */}
      <section className="master-hero">
        <div className="master-hero-copy">
          <h2>Learn at your own pace</h2>
          <p>Build real skills for a better tomorrow.</p>
          <div className="master-hero-features">
            <div className="master-feature-item">
              <span className="master-feature-icon">▶</span>
              <div>Short<br />lectures</div>
            </div>
            <div className="master-feature-item">
              <span className="master-feature-icon">▮▮▮</span>
              <div>Step by step<br />modules</div>
            </div>
            <div className="master-feature-item">
              <span className="master-feature-icon">✓</span>
              <div>Placement<br />ready skills</div>
            </div>
          </div>
        </div>
        <div className="master-hero-art-wrapper">
          <div className="master-scribble">Small Steps<br />Big Growth ↗</div>
          <img
            className="master-hero-art"
            src="/assets/master/lessons/hero-student.png"
            alt="Student learning at a laptop"
          />
        </div>
      </section>

      {tracks.isLoading ? (
        <Loading rows={4} />
      ) : tracks.error ? (
        <ErrorNote error={tracks.error} />
      ) : tracks.data?.tracks.length === 0 ? (
        <Empty icon="▤" title={t('lessons.no_lessons')} body={t('lessons.no_lessons_sub')} />
      ) : (
        <div>
          {tracks.data?.tracks.map((track) => (
            <div key={track.id} style={{ marginBottom: '36px' }}>
              <div className="master-section-title">{track.title}</div>
              {track.modules.map((module, mIdx) => (
                <div key={module.id} style={{ marginBottom: '28px' }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      color: 'var(--master-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      marginBottom: '14px',
                    }}
                  >
                    {module.title}
                  </div>
                  <div className="master-lesson-grid">
                    {module.lessons.map((lesson, lIdx) => {
                      const art = LESSON_ART_SAMPLES[(mIdx + lIdx) % LESSON_ART_SAMPLES.length]
                      const durationMin = lesson.durationSeconds
                        ? Math.max(1, Math.round(lesson.durationSeconds / 60))
                        : 5
                      return (
                        <article key={lesson.id} className="master-lesson-card">
                          <div className="master-thumb">
                            <img src={art} alt={lesson.title} />
                          </div>
                          <div>
                            <div className="master-eyebrow">{module.title}</div>
                            <div className="master-lesson-title">{lesson.title}</div>
                            <div className="master-meta">
                              <span>◷ <b>{durationMin} min</b></span>
                              <span>│</span>
                              <span>
                                {lesson.availableLanguages.includes(language) ? (
                                  <span style={{ color: 'var(--master-green-dark)', fontWeight: 700 }}>
                                    ● {language.toUpperCase()}
                                  </span>
                                ) : (
                                  <span>EN available</span>
                                )}
                              </span>
                              <span>│</span>
                              <span>▮▮ <b>Placement Ready</b></span>
                            </div>
                          </div>
                          <div style={{ position: 'absolute', right: 26, top: 20, color: '#657087', fontSize: 22 }}>
                            ⋮
                          </div>
                          <Link to={`/lessons/${lesson.id}`} aria-label={`Play ${lesson.title}`}>
                            <button className="master-play-btn" type="button">
                              ▶
                            </button>
                          </Link>
                        </article>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Master Consistency Reminder */}
      <section className="master-reminder">
        <div className="master-target-icon">◎</div>
        <div>
          <h3>Stay consistent</h3>
          <p>Practice today, get placed tomorrow.</p>
        </div>
        <img
          className="master-reminder-art"
          src="/assets/master/lessons/study-student.png"
          alt="Student studying and improving"
        />
        <Link to="/practice" className="master-go-btn" style={{ textDecoration: 'none' }} title="Practice">
          ›
        </Link>
      </section>
    </div>
  )
}
