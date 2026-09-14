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
import { Alert, ErrorNote } from '../../components/ui'

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
    <div className="master-container">
      {/* Master Hero */}
      <section className="master-hero">
        <div className="master-hero-copy">
          <h1>Your profile</h1>
          <p>
            Languages and skills are how students find you — this is the matching input, not decoration.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '9px 14px',
                borderRadius: '16px',
                background: '#e1f5eb',
                color: 'var(--master-green-dark)',
                fontWeight: 750,
                fontSize: '14px',
              }}
            >
              Mentor profile
            </span>
            <span
              style={{
                padding: '9px 14px',
                borderRadius: '16px',
                background: '#e1f5eb',
                color: 'var(--master-green-dark)',
                fontWeight: 750,
                fontSize: '14px',
              }}
            >
              Placement skills
            </span>
            <span
              style={{
                padding: '9px 14px',
                borderRadius: '16px',
                background: '#e1f5eb',
                color: 'var(--master-green-dark)',
                fontWeight: 750,
                fontSize: '14px',
              }}
            >
              Live teaching
            </span>
          </div>
        </div>
        <div className="master-hero-art-wrapper">
          <img
            className="master-hero-art"
            src="/assets/master/mentor-profile/mentor-profile.png"
            alt="SkillFlex mentor"
          />
        </div>
      </section>

      {saved && <Alert tone="ok">Profile saved successfully ✓</Alert>}
      <ErrorNote error={save.error} />

      <div className="master-2col">
        {/* Left: Edit Form */}
        <article className="master-card">
          <h2 style={{ fontSize: '24px', fontWeight: 850, margin: '0 0 20px' }}>
            Profile details
          </h2>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontWeight: 750, color: '#4a596e', marginBottom: '8px' }}>
              Headline
            </label>
            <input
              className="master-input"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Interview coach, ex-TCS"
              maxLength={200}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontWeight: 750, color: '#4a596e', marginBottom: '8px' }}>
              About you
            </label>
            <textarea
              className="master-textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell students about your coaching experience..."
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#5c697c', marginBottom: '10px' }}>
              I can mentor in
            </div>
            <div className="master-chips">
              {SUPPORTED_LANGUAGES.map((l) => {
                const active = languages.includes(l)
                return (
                  <button
                    key={l}
                    type="button"
                    className={`master-chip ${active ? 'active' : ''}`}
                    onClick={() =>
                      setLanguages((prev = []) => {
                        if (prev.includes(l)) {
                          if (prev.length <= 1) return prev
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
            <div style={{ color: '#778394', fontSize: '13px', marginTop: '6px' }}>
              Select languages you can mentor students in.
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#5c697c', marginBottom: '10px' }}>
              Skills I coach
            </div>
            <div className="master-chips">
              {SKILLS.map((s) => {
                const active = skills.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    className={`master-chip ${active ? 'active' : ''}`}
                    onClick={() =>
                      setSkills((prev) =>
                        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                      )
                    }
                  >
                    {active ? `✓ ${SKILL_LABELS[s]}` : SKILL_LABELS[s]}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontWeight: 750, color: '#4a596e', marginBottom: '8px' }}>
              Max active students
            </label>
            <input
              className="master-input"
              type="number"
              min={1}
              max={200}
              value={maxActiveStudents}
              onChange={(e) => setMaxActiveStudents(Number(e.target.value))}
            />
            <div style={{ color: '#778394', fontSize: '13px', marginTop: '6px' }}>
              Once you hit this, students cannot switch to you until a slot frees up.
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 0',
              borderTop: '1px solid #eef3f0',
            }}
          >
            <div
              className={`master-toggle ${isAccepting ? '' : 'off'}`}
              onClick={() => setIsAccepting(!isAccepting)}
            />
            <div>
              <strong style={{ display: 'block', fontSize: '15px' }}>
                I'm accepting new students
              </strong>
              <span style={{ color: 'var(--master-muted)', fontSize: '13px' }}>
                Students can request to learn with you.
              </span>
            </div>
          </div>
        </article>

        {/* Right: Live Preview Card & Save */}
        <aside>
          <div className="master-card">
            <h2 style={{ fontSize: '22px', fontWeight: 850, margin: '0 0 16px' }}>
              How students see you
            </h2>
            <div
              style={{
                background: '#e0f6eb',
                borderRadius: '22px',
                padding: '22px',
                marginBottom: '18px',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: '#cfeee0',
                  overflow: 'hidden',
                  marginBottom: '12px',
                }}
              >
                <img
                  src="/assets/master/mentor-profile/mentor-profile.png"
                  alt={me?.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <h3 style={{ fontSize: '22px', margin: '0 0 4px', fontWeight: 800 }}>
                {me?.name || 'Mentor'}
              </h3>
              <p style={{ margin: 0, color: 'var(--master-muted)', fontSize: '14px', lineHeight: 1.4 }}>
                {headline || 'Interview coach & mentor'}
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  marginTop: '18px',
                }}
              >
                <div style={{ background: '#fff', borderRadius: '16px', padding: '12px' }}>
                  <strong style={{ fontSize: '22px', display: 'block' }}>{maxActiveStudents}</strong>
                  <span style={{ fontSize: '12px', color: 'var(--master-muted)' }}>Student capacity</span>
                </div>
                <div style={{ background: '#fff', borderRadius: '16px', padding: '12px' }}>
                  <strong style={{ fontSize: '22px', display: 'block' }}>{languages.length}</strong>
                  <span style={{ fontSize: '12px', color: 'var(--master-muted)' }}>Languages</span>
                </div>
                <div style={{ background: '#fff', borderRadius: '16px', padding: '12px' }}>
                  <strong style={{ fontSize: '22px', display: 'block' }}>{skills.length}</strong>
                  <span style={{ fontSize: '12px', color: 'var(--master-muted)' }}>Skills</span>
                </div>
                <div style={{ background: '#fff', borderRadius: '16px', padding: '12px' }}>
                  <strong
                    style={{
                      fontSize: '22px',
                      display: 'block',
                      color: isAccepting ? 'var(--master-green-dark)' : '#a15555',
                    }}
                  >
                    {isAccepting ? 'Active' : 'Paused'}
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--master-muted)' }}>Status</span>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--master-muted)', margin: '0 0 18px', lineHeight: 1.45 }}>
              A complete profile helps the right students discover you by language and skill.
            </p>

            <button
              type="button"
              className="master-btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={save.isPending}
              onClick={() => save.mutate()}
            >
              {save.isPending ? 'Saving...' : 'Save profile'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
