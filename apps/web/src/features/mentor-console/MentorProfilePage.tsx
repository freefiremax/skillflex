import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  LANGUAGE_LABELS,
  SKILLS,
  SKILL_LABELS,
  SUPPORTED_LANGUAGES,
  type Language,
  type Skill,
} from '@skillflex/shared'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Alert, Card, ErrorNote } from '../../components/ui'

export default function MentorProfilePage() {
  const { me, refresh } = useAuth()

  const [headline, setHeadline] = useState('')
  const [bio, setBio] = useState('')
  const [languages, setLanguages] = useState<Language[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [maxActiveStudents, setMaxActiveStudents] = useState(25)
  const [isAccepting, setIsAccepting] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!me?.mentor) return
    setHeadline(me.mentor.headline ?? '')
    // Hydrate every field the save below sends. A field left at its useState
    // default still gets PATCHed, so an unloaded bio saves as '' and an unloaded
    // checkbox saves as "accepting" — both destructive, neither visible.
    setBio(me.mentor.bio ?? '')
    setLanguages(me.mentor.languages)
    setSkills(me.mentor.skills as Skill[])
    setMaxActiveStudents(me.mentor.maxActiveStudents)
    setIsAccepting(me.mentor.isAcceptingStudents)
  }, [me])

  const save = useMutation({
    mutationFn: () =>
      api.patch('/mentorship/profile', {
        headline,
        bio,
        languages,
        skills,
        maxActiveStudents,
        isAcceptingStudents: isAccepting,
      }),
    onSuccess: async () => {
      setSaved(true)
      await refresh()
      setTimeout(() => setSaved(false), 2500)
    },
  })

  return (
    <div className="stack">
      <div>
        <h1>Your profile</h1>
        <p className="small">
          Languages and skills are how students find you — this is the matching input, not decoration.
        </p>
      </div>

      {saved && <Alert tone="ok">Saved.</Alert>}

      <Card>
        <div className="field">
          <label htmlFor="headline">Headline</label>
          <input
            id="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Interview coach, ex-TCS"
            maxLength={200}
          />
        </div>

        <div className="field">
          <label htmlFor="bio">About you</label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="How you work with students, and who you're best for."
          />
        </div>

        <div className="field">
          <label>I can mentor in</label>
          <div className="row wrap" style={{ gap: '0.35rem' }}>
            {SUPPORTED_LANGUAGES.map((l) => (
              <button
                key={l}
                type="button"
                className={`btn btn-sm ${languages.includes(l) ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() =>
                  setLanguages((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]))
                }
              >
                {LANGUAGE_LABELS[l]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Skills I coach</label>
          <div className="row wrap" style={{ gap: '0.35rem' }}>
            {SKILLS.map((s) => (
              <button
                key={s}
                type="button"
                className={`btn btn-sm ${skills.includes(s) ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() =>
                  setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
                }
              >
                {SKILL_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="cap">Max active students</label>
          <input
            id="cap"
            type="number"
            min={1}
            max={200}
            value={maxActiveStudents}
            onChange={(e) => setMaxActiveStudents(Number(e.target.value))}
          />
          <div className="hint">
            Once you hit this, students can't switch to you until a slot frees up. Set it to what you
            can genuinely review every week.
          </div>
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label className="row" style={{ gap: '0.6rem' }}>
            <input
              type="checkbox"
              checked={isAccepting}
              onChange={(e) => setIsAccepting(e.target.checked)}
              style={{ width: 20, height: 20, minHeight: 20, flex: '0 0 auto' }}
            />
            <span className="small" style={{ fontWeight: 400, color: 'var(--text-dim)' }}>
              I'm accepting new students
            </span>
          </label>
        </div>
      </Card>

      <ErrorNote error={save.error} />

      <button className="btn btn-primary btn-block" disabled={save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? 'Saving…' : 'Save profile'}
      </button>
    </div>
  )
}
