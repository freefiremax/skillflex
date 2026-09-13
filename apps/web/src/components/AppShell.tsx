import { useEffect, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, type Language } from '@skillflex/shared'
import { useAuth } from '../lib/auth'
import { MascotGuide } from './MascotGuide'
import { IosTabBar, type IosTabItem } from './IosTabBar'

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5v9.5a1 1 0 0 1-1 1h-5v-6h-4v6H4a1 1 0 0 1-1-1v-9.5z" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.22 : 0} />
    </svg>
  )
}

function LessonsIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="15" rx="3" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.22 : 0} />
      <polygon points="10 8.5 15.5 11.5 10 14.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function LiveIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <path d="M7.05 16.95a7 7 0 0 1 0-9.9M16.95 7.05a7 7 0 0 1 0 9.9" />
      <path d="M4.22 19.78a11 11 0 0 1 0-15.56M19.78 4.22a11 11 0 0 1 0 15.56" opacity={active ? 1 : 0.6} />
    </svg>
  )
}

function FeedbackIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.25 : 0} />
    </svg>
  )
}

function PlanIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.22 : 0} />
      <path d="M6 4H4.5a2.5 2.5 0 0 0 0 5H6M18 4h1.5a2.5 2.5 0 0 1 0 5H18" />
      <path d="M12 15v4M8 22h8" />
    </svg>
  )
}

function QueueIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2.5" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.22 : 0} />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  )
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7.5" r="4" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.22 : 0} />
      <path d="M5 20.5c0-3.5 3.13-6 7-6s7 2.5 7 6" />
    </svg>
  )
}

const STUDENT_NAV: IosTabItem[] = [
  { to: '/', label: 'Home', icon: (active) => <HomeIcon active={active} /> },
  { to: '/lessons', label: 'Lessons', icon: (active) => <LessonsIcon active={active} /> },
  { to: '/live', label: 'Live', icon: (active) => <LiveIcon active={active} /> },
  { to: '/feedback', label: 'Feedback', icon: (active) => <FeedbackIcon active={active} /> },
  { to: '/plan', label: 'Plan', icon: (active) => <PlanIcon active={active} /> },
]

const MENTOR_NAV: IosTabItem[] = [
  { to: '/', label: 'Queue', icon: (active) => <QueueIcon active={active} /> },
  { to: '/live', label: 'Live', icon: (active) => <LiveIcon active={active} /> },
  { to: '/profile', label: 'Profile', icon: (active) => <ProfileIcon active={active} /> },
]

const ADMIN_NAV: IosTabItem[] = [
  { to: '/', label: 'Dashboard', icon: (active) => <QueueIcon active={active} /> },
]

function IconPerson() {
  return (
    <svg className="tb-icon" viewBox="0 0 24 24" aria-hidden focusable="false">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  )
}

function IconExit() {
  return (
    <svg className="tb-icon" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 8l-4 4 4 4" />
      <path d="M6 12h9" />
    </svg>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { me, language, setLanguage, signOut } = useAuth()
  const { pathname } = useLocation()

  const nav =
    me?.role === 'student' ? STUDENT_NAV : me?.role === 'mentor' ? MENTOR_NAV : ADMIN_NAV

  const mint = me?.role === 'student' && pathname === '/'

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])

  return (
    <div className="theme-mint">
      <IosTabBar items={nav} className="nav-desktop" />

      <div className="shell">
        <header className="topbar">
          <div className="brand">
            Skill<span className="brand-flex">Flex</span>
          </div>
          <div className="row" style={{ gap: '0.5rem' }}>
            {me?.role === 'student' && (
              <select
                aria-label="Lesson language"
                className="lang-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {LANGUAGE_LABELS[l]}
                  </option>
                ))}
              </select>
            )}
            <NavLink to="/account" className="pill">
              <IconPerson />
              <span className="pill-name">{me?.name?.split(' ')[0] ?? 'Account'}</span>
            </NavLink>
            <button className="btn btn-ghost btn-sm" onClick={signOut} aria-label="Exit">
              <IconExit />
              <span className="btn-label">Exit</span>
            </button>
          </div>
        </header>

        <main className="page" key={pathname}>
          {children}
        </main>
      </div>

      <IosTabBar items={nav} className="nav-mobile" />

      <MascotGuide />
    </div>
  )
}
