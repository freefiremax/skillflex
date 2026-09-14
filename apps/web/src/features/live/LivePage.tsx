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
  const [notified, setNotified] = useState(false)

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
      {/* Hero Section */}
      <section className="master-hero">
        <div className="master-hero-copy">
          <h1>{t('live.title')}</h1>
          <p>
            Group lectures with a real mentor, and every past one recorded so you can catch up.
          </p>
          <div className="master-hero-features">
            <div className="master-feature-item">
              <span className="master-feature-icon">●●●</span>
              <div>Learn with<br />mentors</div>
            </div>
            <div className="master-feature-item">
              <span className="master-feature-icon">▶</span>
              <div>Interactive<br />sessions</div>
            </div>
            <div className="master-feature-item">
              <span className="master-feature-icon">◷</span>
              <div>Access recordings<br />anytime</div>
            </div>
          </div>
        </div>
        <div className="master-hero-art-wrapper">
          <img
            className="master-hero-art"
            src="/assets/master/live/live-hero.png"
            alt="SkillFlex learner joining a live mentor session"
          />
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
      <section className="master-card" style={{ padding: '28px' }}>
        {tab !== 'mine' && (
          <div style={{ marginBottom: '22px' }}>
            <div className="master-chips">
              <button
                type="button"
                className={`master-chip ${skill === '' ? 'active' : ''}`}
                onClick={() => setSkill('')}
              >
                ▦ &nbsp; {t('live.all_skills')}
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  color: '#5b697c',
                  fontSize: '15px',
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
              <div className="master-empty-card">
                <img
                  className="master-empty-art"
                  src="/assets/master/live/live-empty.png"
                  alt="No lectures scheduled"
                />
                <h2>No lectures scheduled</h2>
                <p>
                  You're all caught up!<br />
                  New sessions will appear here.
                </p>
                <button
                  type="button"
                  className="master-btn-primary"
                  onClick={() => setNotified(true)}
                >
                  🔔 &nbsp; {notified ? 'Notification scheduled ✓' : 'Notify me when new lectures are scheduled'}
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
              <div className="master-empty-card">
                <img
                  className="master-empty-art"
                  src="/assets/master/live/live-empty.png"
                  alt="No registrations"
                />
                <h2>No live lectures yet</h2>
                <p>Pick an upcoming lecture to attend live or review your recordings.</p>
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
              <div className="master-empty-card">
                <img
                  className="master-empty-art"
                  src="/assets/master/live/live-empty.png"
                  alt="No recordings yet"
                />
                <h2>No recordings available yet</h2>
                <p>Lectures are automatically recorded and published here after they end.</p>
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

        {/* Master Tip */}
        <div className="master-tip">
          <div className="master-tip-icon">💡</div>
          <div>
            <h3>Tip: Keep exploring different skills</h3>
            <p>Attend live lectures to learn directly from mentors and ask your doubts.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
