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
} from '@skillswitch/shared'
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
    queryFn: () => api.get<{ mentor: { id: string } | null }>('/mentorship/me'),
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

  const currentId = current.data?.mentor?.id
  const list = mentors.data?.mentors ?? []

  // --- Confirmation sheet -------------------------------------------------
  if (selected) {
    return (
      <div className="stack">
        <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setSelected(null)}>
          ← Back to list
        </button>

        <h1>Switch to {selected.name}?</h1>

        <Alert tone="info">
          Nothing to pay. You keep all your past feedback, and {selected.name} can see your history
          so you don't start from zero.
        </Alert>

        {/* The reason is required, and it's the compounding data asset — this
            is why the field is a real form control and not an afterthought. */}
        <Card>
          <div className="field">
            <label htmlFor="reason">Why are you switching?</label>
            <select
              id="reason"
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value as SwitchReasonCode)}
            >
              {SWITCH_REASON_CODES.filter((r) => r !== 'initial_assignment').map((r) => (
                <option key={r} value={r}>
                  {SWITCH_REASON_LABELS[r]}
                </option>
              ))}
            </select>
            <div className="hint">
              This stays private from your old mentor. It helps us match people better.
            </div>
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="note">Anything else? (optional)</label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ minHeight: 80 }}
            />
          </div>
        </Card>

        <ErrorNote error={doSwitch.error} />

        <button
          className="btn btn-primary btn-block"
          onClick={() => doSwitch.mutate()}
          disabled={doSwitch.isPending}
        >
          {doSwitch.isPending ? 'Switching…' : `Confirm switch to ${selected.name}`}
        </button>
      </div>
    )
  }

  return (
    <div className="stack">
      <div>
        <h1>Find your mentor</h1>
        <p className="small">
          Mentors from across colleges — not just yours. Filter by the language you actually think in.
        </p>
      </div>

      <Card className="card-tight">
        <div className="stack-sm">
          <input
            placeholder="Search by name or specialty"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="row" style={{ gap: '0.5rem' }}>
            <select value={language} onChange={(e) => setLanguage(e.target.value as Language | '')}>
              <option value="">Any language</option>
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>
              ))}
            </select>
            <select value={skill} onChange={(e) => setSkill(e.target.value as Skill | '')}>
              <option value="">Any skill</option>
              {SKILLS.map((s) => (
                <option key={s} value={s}>{SKILL_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <ErrorNote error={mentors.error} />

      {mentors.isLoading ? (
        <Loading rows={3} />
      ) : list.length === 0 ? (
        <Empty icon="☺" title="No mentors match" body="Try loosening the filters." />
      ) : (
        list.map((m) => {
          const isCurrent = m.id === currentId
          return (
            <Card key={m.id} accent={isCurrent}>
              <div className="row-between" style={{ marginBottom: '0.35rem' }}>
                <div>
                  <div className="strong">{m.name}</div>
                  {m.headline && <div className="tiny dim">{m.headline}</div>}
                </div>
                {isCurrent ? (
                  <Pill tone="brand">Current</Pill>
                ) : m.hasCapacity ? (
                  <Pill tone="ok">{m.spare} slots</Pill>
                ) : (
                  <Pill tone="warn">Full</Pill>
                )}
              </div>

              {m.bio && <p className="small" style={{ marginBottom: '0.6rem' }}>{m.bio}</p>}

              <div className="row wrap" style={{ gap: '0.3rem', marginBottom: '0.3rem' }}>
                {m.languages.map((l) => (
                  <Pill key={l} tone="brand">{LANGUAGE_LABELS[l]}</Pill>
                ))}
              </div>
              <div className="row wrap" style={{ gap: '0.3rem', marginBottom: '0.75rem' }}>
                {m.skills.map((s) => (
                  <Pill key={s}>{SKILL_LABELS[s as keyof typeof SKILL_LABELS] ?? s}</Pill>
                ))}
              </div>

              {!isCurrent && (
                <button
                  className="btn btn-ghost btn-block btn-sm"
                  disabled={!m.hasCapacity}
                  onClick={() => setSelected(m)}
                >
                  {m.hasCapacity ? `Switch to ${m.name.split(' ')[0]}` : 'At capacity'}
                </button>
              )}
            </Card>
          )
        })
      )}
    </div>
  )
}
