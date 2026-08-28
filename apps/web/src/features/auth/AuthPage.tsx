import { useState } from 'react'
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  type Language,
  type Role,
} from '@skillflex/shared'
import { useAuth } from '../../lib/auth'
import { ErrorNote } from '../../components/ui'

type Mode = 'signin' | 'signup'

export default function AuthPage() {
  const { signIn, signUp, authError } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('student')
  const [orgSlug, setOrgSlug] = useState('avcoe')
  const [languages, setLanguages] = useState<Language[]>(['en', 'hi'])
  const [consent, setConsent] = useState(false)
  const [guardianName, setGuardianName] = useState('')
  const [guardianEmail, setGuardianEmail] = useState('')
  const [isMinor, setIsMinor] = useState(false)

  function toggleLanguage(l: Language) {
    setLanguages((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
      } else {
        await signUp({
          name,
          email,
          password,
          role,
          preferredLanguages: languages.length ? languages : ['en'],
          ...(role === 'student' || role === 'college_admin' ? { orgSlug } : {}),
          ...(role === 'student' ? { consentVideoRecording: consent } : {}),
          ...(isMinor && guardianName ? { guardianName } : {}),
          ...(isMinor && guardianEmail ? { guardianEmail } : {}),
        })
      }
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="center" style={{ marginBottom: '1.5rem' }}>
        <div className="brand" style={{ fontSize: '1.6rem' }}>
          Skill<span>Flex</span>
        </div>
        <p className="small" style={{ marginTop: '0.4rem' }}>
          Real mentors. Your language. Switch anytime.
        </p>
      </div>

      <div className="tabs" style={{ marginBottom: '1.25rem' }}>
        <button
          className={`tab${mode === 'signin' ? ' active' : ''}`}
          onClick={() => setMode('signin')}
          type="button"
        >
          Sign in
        </button>
        <button
          className={`tab${mode === 'signup' ? ' active' : ''}`}
          onClick={() => setMode('signup')}
          type="button"
        >
          Create account
        </button>
      </div>

      <form className="card" onSubmit={submit}>
        {mode === 'signup' && (
          <>
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            </div>

            <div className="field">
              <label htmlFor="role">I am a</label>
              <select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="student">Student</option>
                <option value="mentor">Mentor</option>
                <option value="college_admin">College / TPO admin</option>
              </select>
            </div>

            {(role === 'student' || role === 'college_admin') && (
              <div className="field">
                <label htmlFor="org">College code</label>
                <input id="org" value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} required />
                <div className="hint">Your college gives you this. Demo code: avcoe</div>
              </div>
            )}

            <div className="field">
              <label>{role === 'mentor' ? 'I can mentor in' : 'I want to learn in'}</label>
              <div className="row wrap">
                {SUPPORTED_LANGUAGES.map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={`btn btn-sm ${languages.includes(l) ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => toggleLanguage(l)}
                  >
                    {LANGUAGE_LABELS[l]}
                  </button>
                ))}
              </div>
              <div className="hint">
                This is how we match you — not a subtitle setting.
              </div>
            </div>
          </>
        )}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === 'signup' ? 8 : 1}
          />
        </div>

        {mode === 'signup' && role === 'student' && (
          <>
            {/* DPDP: consent is explicit, specific, and captured before signup
                completes — not buried in a terms-of-service link. */}
            <div className="field">
              <label className="row" style={{ alignItems: 'flex-start', gap: '0.6rem' }}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  style={{ width: 20, height: 20, minHeight: 20, marginTop: 2, flex: '0 0 auto' }}
                />
                <span className="small" style={{ fontWeight: 400, color: 'var(--text-dim)' }}>
                  I agree to record short practice videos that only my assigned mentor will watch.
                  I can withdraw this anytime, and my videos are deleted after 12 months.
                </span>
              </label>
            </div>

            <div className="field">
              <label className="row" style={{ gap: '0.6rem' }}>
                <input
                  type="checkbox"
                  checked={isMinor}
                  onChange={(e) => setIsMinor(e.target.checked)}
                  style={{ width: 20, height: 20, minHeight: 20, flex: '0 0 auto' }}
                />
                <span className="small" style={{ fontWeight: 400, color: 'var(--text-dim)' }}>
                  I am under 18
                </span>
              </label>
            </div>

            {isMinor && (
              <div className="card card-tight" style={{ marginBottom: '0.9rem' }}>
                <div className="tiny faint" style={{ marginBottom: '0.5rem' }}>
                  A parent or guardian must consent for students under 18.
                </div>
                <div className="field">
                  <label htmlFor="gname">Guardian name</label>
                  <input id="gname" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} required />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label htmlFor="gmail">Guardian email</label>
                  <input
                    id="gmail"
                    type="email"
                    value={guardianEmail}
                    onChange={(e) => setGuardianEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* authError covers the case where a stored token fails to hydrate for a
            reason other than expiry — a down API, a bad deploy — which otherwise
            renders as an empty form and reads like a wrong password. */}
        {error || authError ? (
          <div style={{ marginBottom: '0.9rem' }}><ErrorNote error={error ?? authError} /></div>
        ) : null}

        <button className="btn btn-primary btn-block" disabled={busy} type="submit">
          {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      {mode === 'signin' && (
        <div className="card card-tight" style={{ marginTop: '1rem' }}>
          <div className="tiny faint" style={{ marginBottom: '0.4rem' }}>
            Demo logins — password <span className="mono strong">password123</span>
          </div>
          <div className="stack-sm tiny dim">
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setEmail('rahul@student.avcoe.in'); setPassword('password123') }}>
              Student (has feedback + plan)
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setEmail('anjali@mentor.skillflex.in'); setPassword('password123') }}>
              Mentor
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setEmail('tpo@avcoe.in'); setPassword('password123') }}>
              College admin
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
