import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SKILLS, SKILL_LABELS, LANGUAGE_LABELS } from '@skillflex/shared'
import { api } from '../../lib/api'
import { Card, Empty, ErrorNote, Loading, Pill } from '../../components/ui'
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

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'upcoming', label: t('live.upcoming') },
    { key: 'mine', label: t('live.mine') },
    { key: 'recordings', label: t('live.recordings') },
  ]

  return (
    <div className="stack">
      <div>
        <h1>{t('live.title')}</h1>
        <p className="small">
          Group lectures with a real mentor, and every past one recorded so you can catch up.
        </p>
      </div>

      <div className="tabs">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            type="button"
            className={`tab${tab === tabItem.key ? ' active' : ''}`}
            onClick={() => setTab(tabItem.key)}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* Filters apply to the two browse tabs; "Mine" is already a filter. */}
      {tab !== 'mine' && (
        <Card className="card-tight">
          <div className="row wrap" style={{ gap: '0.35rem' }}>
            <button
              type="button"
              className={`btn btn-sm ${skill === '' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSkill('')}
            >
              {t('live.all_skills')}
            </button>
            {SKILLS.map((s) => (
              <button
                key={s}
                type="button"
                className={`btn btn-sm ${skill === s ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setSkill((prev) => (prev === s ? '' : s))}
              >
                {SKILL_LABELS[s]}
              </button>
            ))}
          </div>
          <label className="row" style={{ gap: '0.5rem', marginTop: '0.6rem' }}>
            <input
              type="checkbox"
              checked={onlyMyLanguage}
              onChange={(e) => setOnlyMyLanguage(e.target.checked)}
              style={{ width: 20, height: 20, minHeight: 20, flex: '0 0 auto' }}
            />
            <span className="tiny dim">{t('live.only_my_lang')} ({LANGUAGE_LABELS[language]})</span>
          </label>
        </Card>
      )}

      {tab === 'upcoming' && (
        <>
          <ErrorNote error={upcoming.error} />
          {upcoming.isLoading ? (
            <Loading rows={3} />
          ) : (upcoming.data?.classes.length ?? 0) === 0 ? (
            <Empty
              icon="◉"
              title={t('live.no_classes')}
              body={t('live.no_classes_sub')}
            />
          ) : (
            <>
              {liveNow.length > 0 && (
                <>
                  <div className="section-title">Happening now</div>
                  <div className="stack-sm">
                    {liveNow.map((c) => (
                      <LiveClassCard key={c.id} cls={c} />
                    ))}
                  </div>
                </>
              )}
              {later.length > 0 && (
                <>
                  <div className="section-title">Coming up</div>
                  <div className="stack-sm">
                    {later.map((c) => (
                      <LiveClassCard key={c.id} cls={c} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {tab === 'mine' && (
        <>
          <ErrorNote error={mine.error} />
          {mine.isLoading ? (
            <Loading rows={3} />
          ) : (mine.data?.upcoming.length ?? 0) + (mine.data?.past.length ?? 0) === 0 ? (
            <Empty
              icon="✓"
              title="You haven't registered for anything"
              body="Register from the Upcoming tab and it shows up here."
            />
          ) : (
            <>
              {(mine.data?.upcoming.length ?? 0) > 0 && (
                <>
                  <div className="section-title">Your next lectures</div>
                  <div className="stack-sm">
                    {mine.data?.upcoming.map((c) => (
                      <LiveClassCard key={c.id} cls={c} />
                    ))}
                  </div>
                </>
              )}
              {(mine.data?.past.length ?? 0) > 0 && (
                <>
                  <div className="section-title">Been and gone</div>
                  <div className="stack-sm">
                    {mine.data?.past.map((c) => (
                      <LiveClassCard
                        key={c.id}
                        cls={c}
                        variant={c.hasRecording ? 'recording' : 'upcoming'}
                      />
                    ))}
                  </div>
                </>
              )}
              {/* Attendance is what the college sees, so show the student the
                  same number rather than letting it be a surprise. */}
              <Card className="card-tight">
                <div className="row-between">
                  <span className="tiny faint">YOU ATTENDED</span>
                  <Pill tone="ok">
                    {(mine.data?.past ?? []).filter((c) => c.attendedAt).length +
                      (mine.data?.upcoming ?? []).filter((c) => c.attendedAt).length}{' '}
                    live
                  </Pill>
                </div>
              </Card>
            </>
          )}
        </>
      )}

      {tab === 'recordings' && (
        <>
          <ErrorNote error={recordings.error} />
          {recordings.isLoading ? (
            <Loading rows={3} />
          ) : (recordings.data?.recordings.length ?? 0) === 0 ? (
            <Empty
              icon="▶"
              title="No recordings yet"
              body="Once a mentor publishes a lecture recording it lands here, permanently."
            />
          ) : (
            <div className="stack-sm">
              {recordings.data?.recordings.map((c) => (
                <LiveClassCard key={c.id} cls={c} variant="recording" />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
