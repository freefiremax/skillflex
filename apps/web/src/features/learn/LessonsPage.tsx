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

const REAL_LESSON_ARTS = [
  '/assets/real/intro-student.jpg',
  '/assets/real/gd-student.jpg',
]

export default function LessonsPage() {
  const { language, t } = useTranslation()

  const tracks = useQuery({
    queryKey: ['tracks', language],
    queryFn: () => api.get<{ tracks: TrackTree[] }>(`/curriculum/tracks?language=${language}`),
  })

  return (
    <div className="master-container">
      {/* Master Hero from SkillFlex_Master */}
      <section
        className="master-card"
        style={{
          padding: 0,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '1.05fr 0.95fr',
          minHeight: '380px',
          background: 'rgba(255, 255, 255, 0.7)',
          marginBottom: '32px',
        }}
      >
        <div style={{ padding: '44px 38px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div
            style={{
              fontSize: '13px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: '#6a7789',
              fontWeight: 800,
              marginBottom: '10px',
            }}
          >
            Learn · Practice · Grow
          </div>
          <h1 style={{ fontSize: 'clamp(38px, 4.5vw, 62px)', letterSpacing: '-3px', lineHeight: 1, margin: '0 0 16px', fontWeight: 850 }}>
            {t('lessons.title')}
          </h1>
          <p style={{ fontSize: '18px', color: '#59687b', margin: '0 0 16px', lineHeight: 1.5 }}>
            Every lecture, module by module. They play in English — change that on{' '}
            <Link to="/languages" style={{ color: 'var(--master-green)', fontWeight: 800, textDecoration: 'none' }}>
              Languages.
            </Link>
          </p>
          <div
            style={{
              fontFamily: '"Segoe Print", "Comic Sans MS", cursive',
              fontSize: '18px',
              lineHeight: 1.35,
              color: '#26364b',
              marginTop: '12px',
            }}
          >
            “Small steps today,<br />big career tomorrow.”
          </div>
        </div>

        <div style={{ minHeight: '280px', background: 'linear-gradient(145deg, #ede5fc, #ded0f7)', overflow: 'hidden' }}>
          <img
            src="/assets/real/hero-study.jpg"
            alt="Student studying with a laptop"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
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
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  margin: '32px 2px 18px',
                }}
              >
                <h2 style={{ fontSize: '26px', margin: 0, letterSpacing: '-1px', fontWeight: 850 }}>
                  {track.title}
                </h2>
                <span style={{ color: 'var(--master-green-dark)', fontWeight: 750, fontSize: '15px' }}>
                  View all →
                </span>
              </div>

              {track.modules.map((module, mIdx) => (
                <div key={module.id} style={{ marginBottom: '24px' }}>
                  <div className="master-lesson-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                    {module.lessons.map((lesson, lIdx) => {
                      const art = REAL_LESSON_ARTS[(mIdx + lIdx) % REAL_LESSON_ARTS.length]
                      const durationMin = lesson.durationSeconds
                        ? Math.max(1, Math.round(lesson.durationSeconds / 60))
                        : 5
                      return (
                        <article
                          key={lesson.id}
                          className="master-card"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '150px 1fr',
                            gap: '18px',
                            alignItems: 'center',
                            padding: '16px',
                            margin: 0,
                          }}
                        >
                          <div
                            style={{
                              height: '140px',
                              borderRadius: '18px',
                              overflow: 'hidden',
                              background: '#ede5fc',
                            }}
                          >
                            <img
                              src={art}
                              alt={lesson.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          </div>

                          <div>
                            <div style={{ fontSize: '12px', letterSpacing: '0.4px', textTransform: 'uppercase', color: '#718095', fontWeight: 750, marginBottom: '4px' }}>
                              {module.title}
                            </div>
                            <h3 style={{ fontSize: '19px', lineHeight: 1.25, margin: '4px 0 10px', letterSpacing: '-0.5px', fontWeight: 800 }}>
                              {lesson.title}
                            </h3>
                            <div style={{ color: '#657388', fontSize: '14px', display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
                              <span>◷ {durationMin} min</span>
                              <span>• Beginner</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Link to={`/lessons/${lesson.id}`} aria-label={`Play ${lesson.title}`}>
                                <button className="master-play-btn" style={{ width: '44px', height: '44px', fontSize: '18px' }} type="button">
                                  ▶
                                </button>
                              </Link>
                              <span
                                style={{
                                  border: '1px solid var(--border)',
                                  color: 'var(--master-green-dark)',
                                  background: '#fff',
                                  borderRadius: '999px',
                                  padding: '6px 12px',
                                  fontWeight: 750,
                                  fontSize: '12px',
                                }}
                              >
                                {language.toUpperCase()}
                              </span>
                            </div>
                          </div>
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

      {/* Banner from SkillFlex_Master */}
      <section
        className="master-card"
        style={{
          padding: 0,
          borderRadius: '25px',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          background: 'linear-gradient(135deg, #ffffff 0%, #faf7fe 45%, #f2eafc 100%)',
          border: '1px solid rgba(139, 92, 246, 0.18)',
          boxShadow: '0 4px 20px rgba(124, 58, 237, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)',
          marginTop: '32px',
        }}
      >
        <div style={{ padding: '34px' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '26px', fontWeight: 850 }}>Keep learning.</h3>
          <p style={{ margin: 0, color: '#556475', fontSize: '17px', lineHeight: 1.45 }}>
            Improve a little every day. You’re building a stronger you.
          </p>
          <div
            style={{
              fontFamily: '"Segoe Print", "Comic Sans MS", cursive',
              fontSize: '18px',
              color: '#26364b',
              marginTop: '18px',
            }}
          >
            Consistency beats talent.
          </div>
        </div>
        <div style={{ minHeight: '190px' }}>
          <img
            src="/assets/real/keep-learning.jpg"
            alt="Student learning at a desk"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      </section>
    </div>
  )
}
