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
import { useTranslation } from '../../lib/i18n'
import { Alert, Card, ErrorNote } from '../../components/ui'

export default function MentorProfilePage() {
  const { me, refresh } = useAuth()
  const { t } = useTranslation()

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
    setLanguages(Array.isArray(me.mentor.languages) ? me.mentor.languages : ['en'])
    setSkills(Array.isArray(me.mentor.skills) ? (me.mentor.skills as Skill[]) : [])
    setMaxActiveStudents(me.mentor.maxActiveStudents ?? 25)
    setIsAccepting(me.mentor.isAcceptingStudents ?? true)
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
        <h1>{t('mentor.title')}</h1>
        <p className="small">
          {t('mentor.subtitle')}
        </p>
      </div>

      {saved && <Alert tone="ok">{t('common.saved')}</Alert>}

      <Card>
        <div className="field">
          <label htmlFor="headline">{t('mentor.headline')}</label>
          <input
            id="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder={t('mentor.headline_ph')}
            maxLength={200}
          />
        </div>

        <div className="field">
          <label htmlFor="bio">{t('mentor.bio')}</label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t('mentor.bio_ph')}
          />
        </div>

        <div className="field">
          <label>{t('mentor.languages')}</label>
          <div className="row wrap" style={{ gap: '0.35rem' }}>
            {SUPPORTED_LANGUAGES.map((l) => {
              const active = languages.includes(l)
              return (
                <button
                  key={l}
                  type="button"
                  className={`btn btn-sm ${active ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() =>
                    setLanguages((prev = []) => {
                      if (prev.includes(l)) {
                        if (prev.length <= 1) return prev // Keep at least one language for mentor matching
                        return prev.filter((x) => x !== l)
                      }
                      return [...prev, l]
                    })
                  }
                >
                  {active ? `✓ ${LANGUAGE_LABELS[l]}` : LANGUAGE_LABELS[l]}
                </button>
              )
            })}
          </div>
          <div className="hint">{t('mentor.languages_hint')}</div>
        </div>

        <div className="field">
          <label>{t('mentor.skills')}</label>
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
          <label htmlFor="cap">{t('mentor.max_students')}</label>
          <input
            id="cap"
            type="number"
            min={1}
            max={200}
            value={maxActiveStudents}
            onChange={(e) => setMaxActiveStudents(Number(e.target.value))}
          />
          <div className="hint">
            {t('mentor.max_students_hint')}
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
              {t('mentor.accepting')}
            </span>
          </label>
        </div>
      </Card>

      <ErrorNote error={save.error} />

      <button className="btn btn-primary btn-block" disabled={save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? t('common.saving') : t('mentor.save')}
      </button>
    </div>
  )
}
