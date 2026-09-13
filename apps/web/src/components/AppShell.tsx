import { useEffect, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, type Language } from '@skillflex/shared'
import { useAuth } from '../lib/auth'
import { MascotGuide } from './MascotGuide'

interface NavEntry {
  to: string
  label: string
  icon: string
}

// Five is the ceiling for the mobile bottom bar — past that the targets get too
// narrow to hit. Live lectures and their recordings share one entry for exactly
// that reason; the split lives in tabs inside the page.
//
// `/` is Home, not "Learn". It was labelled Learn while rendering a grid of
// doors, so signing in looked like being dumped into a lesson index — and there
// appeared to be two competing home screens. Lessons is now its own tab, which
// is what "Learn" always meant. Mentor gave up its slot to keep the bar at five:
// it is one tap from Home and named on every feedback card, whereas lectures are
// the thing you come back for daily.
const STUDENT_NAV: NavEntry[] = [
  { to: '/', label: 'Home', icon: '⌂' },
  { to: '/lessons', label: 'Lessons', icon: '▶' },
  { to: '/live', label: 'Live', icon: '◉' },
  { to: '/feedback', label: 'Feedback', icon: '✎' },
  { to: '/plan', label: 'Plan', icon: '✓' },
]

const MENTOR_NAV: NavEntry[] = [
  { to: '/', label: 'Queue', icon: '▤' },
  { to: '/live', label: 'Live', icon: '◉' },
  { to: '/profile', label: 'Profile', icon: '☺' },
]

const ADMIN_NAV: NavEntry[] = [{ to: '/', label: 'Dashboard', icon: '▤' }]

/**
 * The two topbar glyphs, inline rather than in the icon font of unicode
 * characters the nav uses.
 *
 * The nav gets away with `⌂ ▶ ◉ ✎ ✓` because each one sits above its own word.
 * These two sit *inside* a word, at 15px, where the unicode options render at
 * wildly different weights per platform — `☺` in particular is emoji-substituted
 * on Windows and arrives full-colour. `aria-hidden` throughout: the pill already
 * says the name and the button already says Exit.
 *
 * Both inherit `currentColor`, so the pill's ink and the ghost button's ink
 * carry them — including under `.theme-mint`, where the pill goes green.
 */
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

/** Same markup in the desktop pill bar and the mobile bottom bar. */
function NavItems({ items }: { items: NavEntry[] }) {
  return (
    <>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { me, language, setLanguage, signOut } = useAuth()
  const { pathname } = useLocation()

  const nav =
    me?.role === 'student' ? STUDENT_NAV : me?.role === 'mentor' ? MENTOR_NAV : ADMIN_NAV

  /**
   * Mint is Home's, and only Home's.
   *
   * The wash lives on `body` and `body::before`, which no route can reach, so
   * the theme is a class on a wrapper instead — `.theme-mint` redefines the
   * tokens `Card`, `Pill`, `.nav-item` and `.brand-flex` already read from, and
   * paints over the sage gradient with a fixed pseudo-element. Nothing inside
   * had to learn about it.
   *
   * The wrapper encloses the two nav bars as well, so the active tab is green
   * while you are on Home and gold→teal everywhere else. That is deliberate: the
   * alternative is a mint page sitting under a gold bar, which looks like a bug
   * rather than a decision.
   *
   * Students only. The mentor queue and the admin dashboard share this shell and
   * `/` renders something different for each of them.
   */
  const mint = me?.role === 'student' && pathname === '/'

  // Router keeps the scroll position across navigations, which lands you
  // mid-page on the next screen. Jump (not smooth-scroll — that would animate
  // *away* from content that is already gone) before the enter transition runs.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])

  return (
    <div className={mint ? 'theme-mint' : undefined}>
      <nav className="nav nav-desktop">
        <NavItems items={nav} />
      </nav>

      <div className="shell">
        <header className="topbar">
          <div className="brand">
            Skill<span className="brand-flex">Flex</span>
          </div>
          <div className="row" style={{ gap: '0.5rem' }}>
            {/* Language is a product-level switch for students, not a setting
                buried in a menu — it's the thing that makes lessons usable. */}
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

        {/* Keyed on the route so every navigation replays the enter animation
            instead of swapping content in place. */}
        <main className="page" key={pathname}>
          {children}
        </main>
      </div>

      <nav className="nav nav-mobile">
        <NavItems items={nav} />
      </nav>

      {/* Every signed-in page. The sign-in screen renders outside this shell, so
          it mounts its own copy — see App.tsx. */}
      <MascotGuide />
    </div>
  )
}
