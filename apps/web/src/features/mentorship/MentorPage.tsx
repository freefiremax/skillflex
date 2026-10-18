import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { LANGUAGE_LABELS, SKILL_LABELS, type Language } from '@skillflex/shared'
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
    <div className="master-container" style={{ maxWidth: '860px', margin: '0 auto' }}>
      {/* Hero Header */}
      <section
        style={{
          background: 'linear-gradient(135deg, var(--brand-deep) 0%, var(--brand) 60%, var(--accent) 100%)',
          borderRadius: '24px',
          padding: '32px 28px',
          color: '#ffffff',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 32px rgba(82, 39, 179, 0.25)',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '620px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.8px',
              marginBottom: '12px',
              textTransform: 'uppercase',
            }}
          >
            <span>🔄 Guaranteed Core Feature</span>
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 850, margin: '0 0 10px', lineHeight: 1.15, color: '#fff' }}>
            Your 1-on-1 Mentor
          </h1>
          <p style={{ fontSize: '16px', lineHeight: 1.5, color: 'rgba(255, 255, 255, 0.88)', margin: 0 }}>
            Every video task you record is reviewed by a real human mentor. You have complete freedom to switch mentors across our nationwide network anytime at zero extra cost.
          </p>
        </div>

        <div
          style={{
            position: 'absolute',
            right: '-15px',
            bottom: '-20px',
            fontSize: '140px',
            opacity: 0.18,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          🧑‍🏫
        </div>
      </section>

      {/* CORE HIGHLIGHT: The "Switch Mentor" Priority Hero Box */}
      <section
        style={{
          background: 'linear-gradient(135deg, var(--master-green-soft) 0%, var(--surface) 100%)',
          border: '2px solid var(--brand)',
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '28px',
          boxShadow: '0 8px 24px rgba(112, 68, 214, 0.12)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '22px' }}>🔄</span>
              <h2 style={{ fontSize: '20px', fontWeight: 850, margin: 0, color: 'var(--master-ink)' }}>
                Not the right fit? Switch your mentor anytime
              </h2>
            </div>
            <p style={{ fontSize: '15px', color: 'var(--master-muted)', margin: 0, maxWidth: '600px' }}>
              Different learners need different teaching styles, languages, and feedback approaches. Finding the mentor you click with is essential.
            </p>
          </div>

          <button
            type="button"
            className="master-btn-primary"
            style={{
              padding: '14px 24px',
              fontSize: '16px',
              fontWeight: 850,
              background: 'linear-gradient(135deg, var(--cta-from), var(--cta-to))',
              boxShadow: '0 6px 20px rgba(112, 68, 214, 0.3)',
              flexShrink: 0,
            }}
            onClick={() => navigate('/mentor/browse')}
          >
            🔄 Browse Mentors & Switch Now →
          </button>
        </div>

        {/* 4 Trust Guarantee Pillars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line-strong)' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '20px' }}>🪙</span>
            <div>
              <strong style={{ display: 'block', fontSize: '13px', color: 'var(--master-ink)' }}>Always ₹0 Free</strong>
              <span style={{ fontSize: '12px', color: 'var(--master-muted)' }}>Unlimited switching included with your account.</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '20px' }}>📁</span>
            <div>
              <strong style={{ display: 'block', fontSize: '13px', color: 'var(--master-ink)' }}>100% History Kept</strong>
              <span style={{ fontSize: '12px', color: 'var(--master-muted)' }}>All your videos, rubrics & notes stay forever.</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '20px' }}>🤝</span>
            <div>
              <strong style={{ display: 'block', fontSize: '13px', color: 'var(--master-ink)' }}>Zero Disruption</strong>
              <span style={{ fontSize: '12px', color: 'var(--master-muted)' }}>Your new mentor sees past notes so you don't start over.</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '20px' }}>🏛️</span>
            <div>
              <strong style={{ display: 'block', fontSize: '13px', color: 'var(--master-ink)' }}>Cross-College Pool</strong>
              <span style={{ fontSize: '12px', color: 'var(--master-muted)' }}>Access mentors from across institutions nationwide.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Current Mentor Profile Card */}
      {!m ? (
        <article className="master-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Empty icon="☺" title="No mentor currently assigned" body="Pick someone from the cross-institutional pool to start reviewing your work." />
          <button
            type="button"
            className="master-btn-primary"
            style={{ margin: '20px auto 0', padding: '14px 28px' }}
            onClick={() => navigate('/mentor/browse')}
          >
            Find & Pick a Mentor →
          </button>
        </article>
      ) : (
        <article className="master-card" style={{ marginBottom: '24px', padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, var(--brand-tint), var(--master-green-soft))',
                  color: 'var(--master-green-dark)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '26px',
                  fontWeight: 850,
                  boxShadow: '0 4px 12px rgba(112, 68, 214, 0.12)',
                }}
              >
                {m.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--master-green)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>
                  ● Active Assigned Mentor
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 850, margin: '0 0 4px', color: 'var(--master-ink)' }}>{m.name}</h2>
                {m.headline && <div style={{ fontSize: '15px', color: 'var(--master-muted)', fontWeight: 500 }}>{m.headline}</div>}
              </div>
            </div>

            <button
              type="button"
              className="master-chip"
              style={{ padding: '10px 18px', fontWeight: 800, color: 'var(--brand-deep)', borderColor: 'var(--line-strong)' }}
              onClick={() => navigate('/mentor/browse')}
            >
              🔄 Change Mentor
            </button>
          </div>

          {mine.data?.since && (
            <div style={{ fontSize: '13px', color: 'var(--master-muted)', marginBottom: '16px' }}>
              Guiding your communication journey since <strong>{formatDate(mine.data.since)}</strong>
            </div>
          )}

          {m.bio && (
            <div
              style={{
                fontSize: '15px',
                color: 'var(--master-ink)',
                lineHeight: 1.55,
                background: 'var(--master-green-soft)',
                border: '1px solid var(--master-line)',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '18px',
              }}
            >
              {m.bio}
            </div>
          )}

          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--master-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '6px' }}>
                Languages Spoken
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {m.languages.map((l) => (
                  <Pill key={l} tone="brand">🗣 {LANGUAGE_LABELS[l]}</Pill>
                ))}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--master-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '6px' }}>
                Specialist Skill Areas
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {m.skills.map((s) => (
                  <Pill key={s}>🎯 {SKILL_LABELS[s as keyof typeof SKILL_LABELS] ?? s}</Pill>
                ))}
              </div>
            </div>
          </div>
        </article>
      )}

      {/* Switch History Timeline */}
      {switches.length > 0 && (
        <section className="master-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 850, margin: '0 0 16px', color: 'var(--master-ink)' }}>
            Your Mentorship Switch History
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {switches.map((e) => (
              <div
                key={e.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--master-green-soft)',
                  border: '1px solid var(--master-line)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: '14px',
                }}
              >
                <div>
                  <div>
                    {e.from ? `${e.from} → ` : ''}
                    <strong style={{ color: 'var(--brand-deep)' }}>{e.to}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--master-muted)', marginTop: '2px' }}>
                    Reason: <em>{e.reasonLabel}</em>
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>{formatDate(e.at)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
