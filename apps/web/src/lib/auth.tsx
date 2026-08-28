import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Language, Role } from '@skillflex/shared'
import { api, ApiRequestError, getToken, onUnauthorized, setToken } from './api'

export interface Me {
  id: string
  name: string
  email: string
  role: Role
  org: { id: string; name: string } | null
  student: { id: string; preferredLanguages: Language[]; cohort: string | null } | null
  mentor: {
    id: string
    headline: string | null
    /** Shown to students in the directory, so the profile form must round-trip it. */
    bio: string | null
    languages: Language[]
    skills: string[]
    maxActiveStudents: number
    isAcceptingStudents: boolean
  } | null
}

interface AuthState {
  me: Me | null
  loading: boolean
  /**
   * A server failure from the last /auth/me hydration that was NOT a 401.
   * Surfaced on the sign-in screen: without it a broken API is indistinguishable
   * from a wrong password, because both just re-render an empty form.
   */
  authError: unknown
  /** The language the student is currently learning in. */
  language: Language
  setLanguage: (l: Language) => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: Record<string, unknown>) => Promise<void>
  signOut: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)
const LANG_KEY = 'skillflex.language'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<unknown>(null)
  const [language, setLanguageState] = useState<Language>(
    () => (localStorage.getItem(LANG_KEY) as Language) || 'en',
  )

  async function load() {
    if (!getToken()) {
      setMe(null)
      setLoading(false)
      return
    }
    try {
      const data = await api.get<Me>('/auth/me')
      setMe(data)
      setAuthError(null)
      // Default the UI language to the student's own first preference.
      if (!localStorage.getItem(LANG_KEY) && data.student?.preferredLanguages[0]) {
        setLanguage(data.student.preferredLanguages[0])
      }
    } catch (err) {
      setMe(null)
      // A 401 is the ordinary expired-token path: drop to the login form quietly.
      if (err instanceof ApiRequestError && err.status === 401) {
        setAuthError(null)
        return
      }
      // Anything else is a real server problem. Record it AND rethrow, so a
      // sign-in that fails during hydration rejects instead of silently
      // re-rendering a pristine form as though nothing had been submitted.
      setAuthError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial hydration has no caller to reject to — authError carries it instead.
    void load().catch(() => {})
  }, [])

  useEffect(() => {
    // api.ts clears the token on a 401, but only this provider can clear `me`.
    onUnauthorized(() => {
      setMe(null)
      setAuthError(null)
    })
    return () => onUnauthorized(undefined)
  }, [])

  function setLanguage(l: Language) {
    localStorage.setItem(LANG_KEY, l)
    setLanguageState(l)
  }

  const value = useMemo<AuthState>(
    () => ({
      me,
      loading,
      authError,
      language,
      setLanguage,
      async signIn(email, password) {
        const res = await api.post<{ token: string }>('/auth/login', { email, password })
        setToken(res.token)
        setLoading(true)
        await load()
      },
      async signUp(input) {
        const res = await api.post<{ token: string }>('/auth/register', input)
        setToken(res.token)
        setLoading(true)
        await load()
      },
      signOut() {
        setToken(null)
        localStorage.removeItem(LANG_KEY)
        setMe(null)
        setAuthError(null)
      },
      refresh: load,
    }),
    [me, loading, authError, language],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
