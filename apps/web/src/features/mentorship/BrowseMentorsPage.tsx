import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  LANGUAGE_LABELS,
  SKILLS,
  SKILL_LABELS,
  SUPPORTED_LANGUAGES,
  SWITCH_REASON_CODES,
  SWITCH_REASON_LABELS,
  type Language,
  type Skill,
  type SwitchReasonCode,
} from '@skillflex/shared'
import { api } from '../../lib/api'
import { Alert, Card, Empty, ErrorNote, Loading, Pill } from '../../components/ui'

interface MentorCard {
  id: string
  name: string
  headline: string | null
  bio: string | null
  languages: Language[]
  skills: string[]
  hasCapacity: boolean
  spare: number
}

export default function BrowseMentorsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [language, setLanguage] = useState<Language | ''>('')
  const [skill, setSkill] = useState<Skill | ''>('')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<MentorCard | null>(null)
  const [reasonCode, setReasonCode] = useState<SwitchReasonCode>('teaching_style')
  const [note, setNote] = useState('')

  const params = new URLSearchParams()
  if (language) params.set('language', language)
  if (skill) params.set('skill', skill)
  if (q.trim()) params.set('q', q.trim())

  const mentors = useQuery({
    queryKey: ['mentors', language, skill, q],
    queryFn: () => api.get<{ mentors: MentorCard[] }>(`/mentorship/mentors?${params.toString()}`),
  })

  const current = useQuery({
    queryKey: ['my-mentor'],
    queryFn: () => api.get<{ mentor: { id: string; name: string } | null }>('/mentorship/me'),
  })

  const doSwitch = useMutation({
    mutationFn: () =>
      api.post('/mentorship/switch', {
        toMentorId: selected!.id,
        reasonCode,
        ...(note.trim() ? { note: note.trim() } : {}),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-mentor'] })
      await queryClient.invalidateQueries({ queryKey: ['switch-history'] })
      setSelected(null)
      navigate('/mentor')
    },
  })

  const currentMentor = current.data?.mentor
  const currentId = currentMentor?.id
  const list = mentors.data?.mentors ?? []

  // ---------------------------------------------------------------------------
  // Confirmation Flow
  // ---------------------------------------------------------------------------
  if (selected) {
    return (
      <div className="master-container" style={{ maxWidth: '680px', margin: '0 auto' }}>
        <button
          type="button"
          className="master-chip"
          style={{ marginBottom: '20px', alignSelf: 'flex-start' }}
          onClick={() => setSelected(null)}
        >
          ← Back to mentors list
        </button>

        <article className="master-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '28px' }}>🔄</span>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Confirm Free Mentor Switch
            </div>
          </div>

          <h1 style={{ fontSize: '26px', fontWeight: 850, margin: '0 0 12px', color: 'var(--master-ink)' }}>
            Switch to {selected.name}?
          </h1>

          <div
            style={{
              background: 'var(--master-green-soft)',
              border: '1.5px solid var(--line-strong)',
              borderRadius: '16px',
              padding: '16px 18px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: 'var(--master-green-dark)', fontSize: '14px', marginBottom: '4px' }}>
              <span>✓ Guaranteed 100% Free Switch</span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.45 }}>
              You pay nothing. You keep every piece of past feedback, task video, and scorecard. {selected.name} will be briefed on your history so you never have to start over.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              doSwitch.mutate()
            }}
          >
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontWeight: 800, color: 'var(--text-dim)', marginBottom: '8px', fontSize: '14px' }}>
                Why are you switching? *
              </label>
              <select
                className="master-select"
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value as SwitchReasonCode)}
              >
                {SWITCH_REASON_CODES.filter((r) => r !== 'initial_assignment').map((r) => (
                  <option key={r} value={r}>
                    {SWITCH_REASON_LABELS[r]}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '12px', color: 'var(--master-muted)', marginTop: '6px' }}>
                🔒 This is completely private and never visible to your previous mentor. It helps our matching algorithm.
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontWeight: 800, color: 'var(--text-dim)', marginBottom: '8px', fontSize: '14px' }}>
                Any specific goals or notes for {selected.name.split(' ')[0]}? (Optional)
              </label>
              <textarea
                className="master-textarea"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Preparing for TCS interviews next month, want sharper feedback on pronunciation and pacing..."
                rows={3}
              />
            </div>

            <ErrorNote error={doSwitch.error} />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                className="master-btn-primary"
                style={{ flex: 1, justifyContent: 'center', padding: '16px', fontSize: '16px', background: 'linear-gradient(135deg, var(--cta-from), var(--cta-to))' }}
                disabled={doSwitch.isPending}
              >
                {doSwitch.isPending ? 'Switching mentor…' : `Confirm switch to ${selected.name}`}
              </button>
              <button
                type="button"
                className="master-chip"
                style={{ padding: '14px 22px' }}
                onClick={() => setSelected(null)}
                disabled={doSwitch.isPending}
              >
                Cancel
              </button>
            </div>
          </form>
        </article>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Mentors Browser List
  // ---------------------------------------------------------------------------
  return (
    <div className="master-container" style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Top Banner */}
      <section
        style={{
          background: 'linear-gradient(135deg, var(--brand-deep) 0%, var(--brand) 60%, var(--accent) 100%)',
          borderRadius: '24px',
          padding: '32px 28px',
          color: '#ffffff',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 32px rgba(30, 58, 138, 0.22)',
        }}
      >
        <div style={{ maxWidth: '640px', position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.16)',
              backdropFilter: 'blur(8px)',
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.8px',
              marginBottom: '10px',
              textTransform: 'uppercase',
            }}
          >
            <span>🔄 Guaranteed Freedom to Switch</span>
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 850, margin: '0 0 10px', color: '#fff', lineHeight: 1.15 }}>
            Find & Switch to Your Ideal Mentor
          </h1>
          <p style={{ fontSize: '16px', lineHeight: 1.5, color: 'rgba(255, 255, 255, 0.88)', margin: 0 }}>
            Mentors from across top institutions nationwide. Filter by the languages you think in and the exact communication skills you want to strengthen.
          </p>
        </div>

        <div
          style={{
            position: 'absolute',
            right: '-15px',
            bottom: '-20px',
            fontSize: '140px',
            opacity: 0.16,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          🤝
        </div>
      </section>

      {/* Current Mentor Alert Bar */}
      {currentMentor && (
        <div
          style={{
            background: 'var(--master-green-soft)',
            border: '1.5px solid var(--brand)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>👨‍🏫</span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--master-green-dark)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Your Current Mentor
              </div>
              <strong style={{ fontSize: '16px', color: 'var(--master-ink)' }}>{currentMentor.name}</strong>
            </div>
          </div>

          <div style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 600 }}>
            Switching is free, instant, and preserves all your past submissions.
          </div>
        </div>
      )}

      {/* Filter Card */}
      <article className="master-card" style={{ marginBottom: '24px', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-dim)', marginBottom: '6px' }}>
              Search by Mentor Name or Specialty
            </label>
            <input
              className="master-input"
              placeholder="e.g. Priya Sharma or Interview Prep"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-dim)', marginBottom: '6px' }}>
              Language Spoken
            </label>
            <select
              className="master-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language | '')}
            >
              <option value="">Any Language (All)</option>
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-dim)', marginBottom: '6px' }}>
              Skill Specialization
            </label>
            <select
              className="master-select"
              value={skill}
              onChange={(e) => setSkill(e.target.value as Skill | '')}
            >
              <option value="">Any Skill Focus (All)</option>
              {SKILLS.map((s) => (
                <option key={s} value={s}>{SKILL_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>
      </article>

      <ErrorNote error={mentors.error} />

      {/* Mentors Grid */}
      {mentors.isLoading ? (
        <Loading rows={4} />
      ) : list.length === 0 ? (
        <article className="master-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Empty icon="☺" title="No mentors match these filters" body="Try clearing search or language filters to see all available mentors in the network." />
          <button
            type="button"
            className="master-chip"
            style={{ marginTop: '16px' }}
            onClick={() => {
              setLanguage('')
              setSkill('')
              setQ('')
            }}
          >
            Clear all filters
          </button>
        </article>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: '20px' }}>
          {list.map((m) => {
            const isCurrent = m.id === currentId
            return (
              <article
                key={m.id}
                className="master-card"
                style={{
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: isCurrent ? '2px solid var(--brand)' : '1px solid var(--master-line)',
                  boxShadow: isCurrent ? '0 8px 24px rgba(112, 68, 214, 0.16)' : 'var(--master-shadow-soft)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '16px',
                          background: isCurrent ? 'linear-gradient(135deg, var(--brand-tint), var(--master-green-soft))' : 'linear-gradient(135deg, var(--surface), var(--surface-2))',
                          color: isCurrent ? 'var(--master-green-dark)' : 'var(--master-ink)',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: '20px',
                          fontWeight: 850,
                        }}
                      >
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 850, margin: '0 0 2px', color: 'var(--master-ink)' }}>{m.name}</h3>
                        {m.headline && <div style={{ fontSize: '13px', color: 'var(--master-muted)' }}>{m.headline}</div>}
                      </div>
                    </div>

                    {isCurrent ? (
                      <Pill tone="brand">Current</Pill>
                    ) : m.hasCapacity ? (
                      <Pill tone="ok">{m.spare} open slots</Pill>
                    ) : (
                      <Pill tone="warn">At capacity</Pill>
                    )}
                  </div>

                  {m.bio && (
                    <p style={{ fontSize: '14px', color: 'var(--text-dim)', lineHeight: 1.45, marginBottom: '14px' }}>
                      {m.bio}
                    </p>
                  )}

                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '4px' }}>
                      Languages
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {m.languages.map((l) => (
                        <Pill key={l} tone="brand">{LANGUAGE_LABELS[l]}</Pill>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '4px' }}>
                      Specialties
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {m.skills.map((s) => (
                        <Pill key={s}>{SKILL_LABELS[s as keyof typeof SKILL_LABELS] ?? s}</Pill>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  {isCurrent ? (
                    <button
                      type="button"
                      className="master-chip"
                      style={{ width: '100%', justifyContent: 'center', fontWeight: 800, background: 'var(--master-green-soft)', color: 'var(--master-muted)' }}
                      disabled
                    >
                      ✓ Your Active Mentor
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="master-btn-primary"
                      style={{
                        width: '100%',
                        justifyContent: 'center',
                        fontSize: '15px',
                                            background: m.hasCapacity
                          ? 'linear-gradient(135deg, var(--cta-from), var(--cta-to))'
                          : 'var(--master-muted)',
                      }}
                      disabled={!m.hasCapacity}
                      onClick={() => setSelected(m)}
                    >
                      {m.hasCapacity ? `🔄 Switch to ${m.name.split(' ')[0]} →` : 'At Capacity'}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
