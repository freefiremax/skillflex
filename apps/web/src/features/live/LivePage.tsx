import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SKILLS, SKILL_LABELS, LANGUAGE_LABELS } from '@skillflex/shared'
import { api } from '../../lib/api'
import { ErrorNote, Loading } from '../../components/ui'
import { LiveClassCard, type LiveClassView } from './LiveBits'
import { useTranslation } from '../../lib/i18n'

type Tab = 'upcoming' | 'mine' | 'recordings'

export default function LivePage() {
  const { language, t } = useTranslation()
  const [tab, setTab] = useState<Tab>('upcoming')
  const [skill, setSkill] = useState('')
  const [onlyMyLanguage, setOnlyMyLanguage] = useState(false)

  const query = new URLSearchParams()
  if (skill) query.set('skill', skill)
  if (onlyMyLanguage) query.set('language', language)
  const qs = query.toString() ? `?${query}` : ''

  const upcoming = useQuery({
    queryKey: ['live-classes', skill, onlyMyLanguage ? language : ''],
    queryFn: () => api.get<{ classes: LiveClassView[] }>(`/live/classes${qs}`),
    enabled: tab === 'upcoming',
  })

  const mine = useQuery({
    queryKey: ['live-my-classes'],
    queryFn: () =>
      api.get<{ upcoming: LiveClassView[]; past: LiveClassView[] }>('/live/my-classes'),
    enabled: tab === 'mine',
  })

  const recordings = useQuery({
    queryKey: ['live-recordings', skill, onlyMyLanguage ? language : ''],
    queryFn: () => api.get<{ recordings: LiveClassView[] }>(`/live/recordings${qs}`),
    enabled: tab === 'recordings',
  })

  const liveNow = (upcoming.data?.classes ?? []).filter((c) => c.status === 'live')
  const later = (upcoming.data?.classes ?? []).filter((c) => c.status !== 'live')

  return (
    <div className="master-container">
      {/* Hero Section from SkillFlex_Master */}
      <section
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div>
          <div
            style={{
              color: 'var(--master-green)',
              fontWeight: 800,
              fontSize: '13px',
              letterSpacing: '1px',
              marginBottom: '6px',
            }}
          >
            ◉ LIVE LEARNING
          </div>
          <h1 style={{ fontSize: 'clamp(38px, 4.5vw, 56px)', lineHeight: 1, margin: '0 0 12px', letterSpacing: '-2px', fontWeight: 850 }}>
            {t('live.title')}
          </h1>
          <p style={{ fontSize: '17px', lineHeight: 1.5, color: '#58667b', margin: 0, maxWidth: '580px' }}>
            Group lectures with a real mentor, and every past one recorded so you can catch up.
          </p>
        </div>

        <div
          style={{
            fontFamily: '"Segoe Print", "Comic Sans MS", cursive',
            fontSize: '16px',
            lineHeight: 1.2,
            fontWeight: 800,
            color: 'var(--master-green-dark)',
            transform: 'rotate(4deg)',
            background: 'rgba(255, 255, 255, 0.85)',
            padding: '10px 14px',
            borderRadius: '14px',
            boxShadow: '0 4px 14px rgba(30, 80, 60, 0.08)',
            flexShrink: 0,
          }}
        >
          Learn Together<br />Grow Better ↗
        </div>
      </section>

      {/* Navigation Tabs */}
      <nav className="master-tabs" aria-label="Live views">
        <button
          type="button"
          className={`master-tab ${tab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setTab('upcoming')}
        >
          {t('live.upcoming')}
        </button>
        <button
          type="button"
          className={`master-tab ${tab === 'mine' ? 'active' : ''}`}
          onClick={() => setTab('mine')}
        >
          {t('live.mine')}
        </button>
        <button
          type="button"
          className={`master-tab ${tab === 'recordings' ? 'active' : ''}`}
          onClick={() => setTab('recordings')}
        >
          {t('live.recordings')}
        </button>
      </nav>

      {/* Main Filter & Classes Panel */}
      <section className="master-card" style={{ padding: '24px' }}>
        {tab !== 'mine' && (
          <div style={{ marginBottom: '22px' }}>
            <div className="master-chips">
              <button
                type="button"
                className={`master-chip ${skill === '' ? 'active' : ''}`}
                onClick={() => setSkill('')}
              >
                All skills
              </button>
              {SKILLS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`master-chip ${skill === s ? 'active' : ''}`}
                  onClick={() => setSkill((prev) => (prev === s ? '' : s))}
                >
                  {SKILL_LABELS[s]}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '12px' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  color: '#5b697c',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                <input
                  type="checkbox"
                  checked={onlyMyLanguage}
                  onChange={(e) => setOnlyMyLanguage(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--master-green)' }}
                />
                <span>Only in my language ({LANGUAGE_LABELS[language]})</span>
              </label>
            </div>
          </div>
        )}

        {/* Tab: Upcoming */}
        {tab === 'upcoming' && (
          <>
            <ErrorNote error={upcoming.error} />
            {upcoming.isLoading ? (
              <Loading rows={3} />
            ) : (upcoming.data?.classes.length ?? 0) === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <img
                  src="/assets/real/hero-study.jpg"
                  alt="Student waiting for live lecture"
                  style={{
                    width: '200px',
                    height: '200px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    objectPosition: 'center 30%',
                    display: 'block',
                    margin: '0 auto 18px',
                    boxShadow: '0 10px 24px rgba(30, 80, 60, 0.12)',
                  }}
                />
                <h2 style={{ fontSize: '24px', margin: '0 0 6px', fontWeight: 800 }}>
                  No lectures scheduled
                </h2>
                <p style={{ fontSize: '15px', color: '#6c788b', lineHeight: 1.45, margin: '0 auto 20px', maxWidth: '300px' }}>
                  New live lectures will appear here.<br />Keep checking!
                </p>
                <button
                  type="button"
                  className="master-btn-primary"
                  onClick={() => setSkill('')}
                >
                  ▣ &nbsp; Explore other skills
                </button>
              </div>
            ) : (
              <div>
                {liveNow.length > 0 && (
                  <div style={{ marginBottom: '28px' }}>
                    <div className="master-section-title">Happening now</div>
                    <div className="master-lesson-grid">
                      {liveNow.map((c) => (
                        <LiveClassCard key={c.id} cls={c} />
                      ))}
                    </div>
                  </div>
                )}
                {later.length > 0 && (
                  <div>
                    <div className="master-section-title">Coming up</div>
                    <div className="master-lesson-grid">
                      {later.map((c) => (
                        <LiveClassCard key={c.id} cls={c} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Tab: Mine */}
        {tab === 'mine' && (
          <>
            <ErrorNote error={mine.error} />
            {mine.isLoading ? (
              <Loading rows={3} />
            ) : (mine.data?.upcoming.length ?? 0) + (mine.data?.past.length ?? 0) === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <img
                  src="/assets/real/hero-study.jpg"
                  alt="No registrations"
                  style={{
                    width: '200px',
                    height: '200px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    display: 'block',
                    margin: '0 auto 18px',
                  }}
                />
                <h2 style={{ fontSize: '24px', margin: '0 0 6px', fontWeight: 800 }}>
                  No registered lectures
                </h2>
                <p style={{ fontSize: '15px', color: '#6c788b', margin: '0 0 20px' }}>
                  Pick an upcoming lecture to attend live or review your recordings.
                </p>
                <button
                  type="button"
                  className="master-btn-primary"
                  onClick={() => setTab('upcoming')}
                >
                  Browse upcoming lectures →
                </button>
              </div>
            ) : (
              <div>
                {(mine.data?.upcoming.length ?? 0) > 0 && (
                  <div style={{ marginBottom: '28px' }}>
                    <div className="master-section-title">Your upcoming sessions</div>
                    <div className="master-lesson-grid">
                      {mine.data?.upcoming.map((c) => (
                        <LiveClassCard key={c.id} cls={c} />
                      ))}
                    </div>
                  </div>
                )}
                {(mine.data?.past.length ?? 0) > 0 && (
                  <div>
                    <div className="master-section-title">Past sessions you attended</div>
                    <div className="master-lesson-grid">
                      {mine.data?.past.map((c) => (
                        <LiveClassCard key={c.id} cls={c} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Tab: Recordings */}
        {tab === 'recordings' && (
          <>
            <ErrorNote error={recordings.error} />
            {recordings.isLoading ? (
              <Loading rows={3} />
            ) : (recordings.data?.recordings.length ?? 0) === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <img
                  src="/assets/real/hero-study.jpg"
                  alt="No recordings"
                  style={{
                    width: '200px',
                    height: '200px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    display: 'block',
                    margin: '0 auto 18px',
                  }}
                />
                <h2 style={{ fontSize: '24px', margin: '0 0 6px', fontWeight: 800 }}>
                  No recordings yet
                </h2>
                <p style={{ fontSize: '15px', color: '#6c788b' }}>
                  Lectures are automatically recorded and published here after they end.
                </p>
              </div>
            ) : (
              <div>
                <div className="master-section-title">Published recordings</div>
                <div className="master-lesson-grid">
                  {recordings.data?.recordings.map((c) => (
                    <LiveClassCard key={c.id} cls={c} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
