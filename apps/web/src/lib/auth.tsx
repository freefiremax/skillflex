import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Language, Role } from '@skillswitch/shared'
import { api, getToken, setToken } from './api'

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
    languages: Language[]
    skills: string[]
    maxActiveStudents: number
  } | null
}

interface AuthState {
  me: Me | null
  loading: boolean
  /** The language the student is currently learning in. */
  language: Language
  setLanguage: (l: Language) => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: Record<string, unknown>) => Promise<void>
  signOut: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)
const LANG_KEY = 'skillswitch.language'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
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
      // Default the UI language to the student's own first preference.
      if (!localStorage.getItem(LANG_KEY) && data.student?.preferredLanguages[0]) {
        setLanguage(data.student.preferredLanguages[0])
      }
    } catch {
      setMe(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function setLanguage(l: Language) {
    localStorage.setItem(LANG_KEY, l)
    setLanguageState(l)
  }

  const value = useMemo<AuthState>(
    () => ({
      me,
      loading,
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
      },
      refresh: load,
    }),
    [me, loading, language],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
