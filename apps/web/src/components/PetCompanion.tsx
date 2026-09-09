import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatRelative } from './ui'

interface PlanItem {
  title: string
  why: string
  done: boolean
}

interface PlanResponse {
  plan: { id: string; items: PlanItem[] } | null
  message?: string
}

/** Only the fields the bubble shows — see LiveBits for the full shape. */
interface NextLive {
  id: string
  title: string
  status: string
  scheduledAt: string
}

/** Roaming range, as a percentage of the viewport width. Kept off both edges so
 *  the pet never clips and the bubble always has room to open. */
const MIN_X = 6
const MAX_X = 84

/** Milliseconds per 1% of screen travelled — a constant walking speed, so
 *  crossing the whole screen takes longer than a short shuffle. */
const MS_PER_PERCENT = 95

interface Activity {
  to: string
  label: string
  icon: string
}

/**
 * The pet is the app's only floating affordance, and `AppShell`'s bottom bar is
 * hard-capped at five entries — so this menu is where anything that cannot fit
 * the nav becomes discoverable. `/practice` has no nav entry at all and is
 * reachable primarily from here.
 *
 * Icons deliberately reuse AppShell's vocabulary, so a row here and the tab it
 * leads to look like the same thing.
 */
const STUDENT_ACTIVITIES: Activity[] = [
  { to: '/practice', label: 'Practise a word', icon: '♪' },
  { to: '/battles', label: 'Battle drills', icon: '⚔' },
  { to: '/', label: 'Record this week’s task', icon: '●' },
  { to: '/feedback', label: 'Mentor feedback', icon: '✎' },
  { to: '/plan', label: 'This week’s plan', icon: '✓' },
  { to: '/live', label: 'Live lectures', icon: '◉' },
  { to: '/languages', label: 'Learn a language', icon: '語' },
  { to: '/progress', label: 'Your level', icon: '◎' },
  { to: '/leaderboard', label: 'College leaderboard', icon: '★' },
  { to: '/mentor', label: 'Your mentor', icon: '☺' },
]

const MENTOR_ACTIVITIES: Activity[] = [
  { to: '/', label: 'Review queue', icon: '▤' },
  { to: '/live', label: 'Your lectures', icon: '◉' },
  { to: '/profile', label: 'Profile', icon: '☺' },
]

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export function PetCompanion() {
  const { me } = useAuth()
  const reduced = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(() => ({
    x: MIN_X + Math.random() * (MAX_X - MIN_X),
    facing: 1 as 1 | -1,
    ms: 0,
  }))

  // The walk loop schedules the *next* hop from the distance of the current
  // one, so it needs today's x synchronously. A state updater runs at commit
  // time, too late for that — hence the ref.
  const xRef = useRef(pos.x)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Only students have a plan. On the sign-in screen there is no token at all,
  // so asking for one would just earn a 401.
  const isStudent = me?.role === 'student'

  // Only fetched when the bubble opens. Shares react-query's ['plan-current']
  // cache with PlanPage, so opening the pet after visiting Plan costs nothing.
  const { data, isLoading, isError } = useQuery({
    queryKey: ['plan-current'],
    queryFn: () => api.get<PlanResponse>('/plans/current'),
    enabled: open && isStudent,
  })

  // Same deal, shared with LearnPage's card. A lecture about to start is more
  // urgent than any plan item, so it gets the top of the bubble.
  const live = useQuery({
    queryKey: ['live-next'],
    queryFn: () => api.get<{ class: NextLive | null }>('/live/next'),
    enabled: open && isStudent,
  })

  useEffect(() => {
    // Standing still while the bubble is open: a pet that walks out from under
    // its own speech bubble is worse than no animation at all.
    if (open || reduced) return

    let timer: ReturnType<typeof setTimeout>
    const hop = () => {
      const from = xRef.current
      const next = MIN_X + Math.random() * (MAX_X - MIN_X)
      const ms = Math.max(900, Math.abs(next - from) * MS_PER_PERCENT)
      xRef.current = next
      setPos({ x: next, facing: next >= from ? 1 : -1, ms })
      timer = setTimeout(hop, ms + 1200 + Math.random() * 2600)
    }

    timer = setTimeout(hop, 1500)
    return () => clearTimeout(timer)
  }, [open, reduced])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  const plan = data?.plan
  const todo = plan?.items.filter((i) => !i.done) ?? []
  const nextLive = live.data?.class ?? null
  const isMentor = me?.role === 'mentor'

  /**
   * Plan state rides along on the "This week's plan" row instead of getting its
   * own list, which is what makes room for the activity menu. One row, one
   * subject — the count is the reason to tap it.
   */
  const planMeta = !isStudent
    ? null
    : isLoading
      ? '…'
      : isError || !plan
        ? null
        : todo.length === 0
          ? 'all done ✓'
          : `${todo.length} left`

  const activities = isStudent ? STUDENT_ACTIVITIES : isMentor ? MENTOR_ACTIVITIES : []

  return (
    <div
      ref={wrapRef}
      className={`pet-wrap${me ? '' : ' pet-wrap-bare'}`}
      style={{
        left: `${pos.x}%`,
        transition: pos.ms ? `left ${pos.ms}ms linear` : 'none',
      }}
    >
      {open && (
        <div
          className={`pet-bubble${pos.x > 55 ? ' pet-bubble-flip' : ''}`}
          role="dialog"
          aria-label={activities.length ? 'What do you want to do?' : 'Your study buddy'}
        >
          <div className="tiny strong" style={{ color: 'var(--accent)' }}>
            {isStudent ? 'WHAT DO YOU WANT TO DO?' : isMentor ? 'YOUR CONSOLE' : 'YOUR STUDY BUDDY'}
          </div>

          {/* Above the menu on purpose: a lecture is time-bound and an activity
              is not, so it is the only thing here that can be missed. */}
          {isStudent && nextLive && (
            <Link
              to={`/live/${nextLive.id}`}
              className="pet-live"
              onClick={() => setOpen(false)}
            >
              {nextLive.status === 'live' && <span className="rec-dot" />}
              <span className="tiny strong">
                {nextLive.status === 'live' ? 'Live now: ' : 'Next lecture: '}
                {nextLive.title}
              </span>
              <span className="tiny faint">
                {nextLive.status === 'live'
                  ? 'tap to join'
                  : formatRelative(nextLive.scheduledAt)}
              </span>
            </Link>
          )}

          {activities.length > 0 ? (
            <div className="pet-actions">
              {activities.map((a) => (
                <Link key={a.to + a.label} to={a.to} className="pet-action" onClick={() => setOpen(false)}>
                  <span className="pet-action-icon" aria-hidden="true">{a.icon}</span>
                  <span className="pet-action-label">{a.label}</span>
                  {a.to === '/plan' && planMeta ? (
                    <span className="pet-action-meta">{planMeta}</span>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : (
            <div className="tiny dim">
              {me
                ? "I look after weekly plans. Students get one built from their mentor's own words."
                : "Sign in and I'll keep this week's plan right here — built from what your mentor actually wrote."}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        className={`pet${open ? ' pet-awake' : ''}`}
        aria-label={
          activities.length
            ? 'Your study buddy — show what you can do'
            : 'Your study buddy'
        }
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{ transform: `scaleX(${pos.facing})` }}
      >
        <svg className="pet-svg" viewBox="0 0 72 68" aria-hidden="true">
          <defs>
            <linearGradient id="petFur" x1="0.2" y1="0" x2="0.8" y2="1">
              <stop offset="0%" stopColor="var(--pet-fur-top)" />
              <stop offset="100%" stopColor="var(--pet-fur-bottom)" />
            </linearGradient>
            <linearGradient id="petTailFur" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="var(--pet-fur-bottom)" />
              <stop offset="75%" stopColor="var(--pet-cream)" />
            </linearGradient>
          </defs>

          <g className="pet-shape">
            {/* Tail first, so it reads as sitting behind the body */}
            <path className="pet-tail" d="M26 57C17 59 10 53 11 45c1-6 6-9 10-7" stroke="url(#petTailFur)" />

            <path d="M36 29c-11 0-18 8-18 18 0 9 8 14 18 14s18-5 18-14c0-10-7-18-18-18Z" fill="url(#petFur)" />
            <ellipse cx="36" cy="50" rx="10" ry="11" fill="var(--pet-cream)" />
            <ellipse cx="28" cy="60" rx="5.5" ry="4" fill="var(--pet-cream)" />
            <ellipse cx="44" cy="60" rx="5.5" ry="4" fill="var(--pet-cream)" />

            <path d="M21 17 24.5 3 34.5 12Z" fill="url(#petFur)" />
            <path d="M51 17 47.5 3 37.5 12Z" fill="url(#petFur)" />
            <path d="M24 15 25.5 7.5 30.5 12Z" fill="var(--pet-pink)" />
            <path d="M48 15 46.5 7.5 41.5 12Z" fill="var(--pet-pink)" />

            <ellipse cx="36" cy="24" rx="19" ry="17" fill="url(#petFur)" />
            <ellipse cx="36" cy="30" rx="12.5" ry="9.5" fill="var(--pet-cream)" />
            <ellipse className="pet-blush" cx="21.5" cy="29" rx="4" ry="2.6" />
            <ellipse className="pet-blush" cx="50.5" cy="29" rx="4" ry="2.6" />

            <g className="pet-eye pet-eye-l">
              <ellipse cx="28.5" cy="23" rx="5.2" ry="6.2" fill="var(--pet-iris)" />
              <ellipse cx="28.5" cy="23.4" rx="3.8" ry="4.8" fill="var(--pet-pupil)" />
              <circle cx="26.7" cy="20.4" r="1.7" fill="#fff" />
            </g>
            <g className="pet-eye pet-eye-r">
              <ellipse cx="43.5" cy="23" rx="5.2" ry="6.2" fill="var(--pet-iris)" />
              <ellipse cx="43.5" cy="23.4" rx="3.8" ry="4.8" fill="var(--pet-pupil)" />
              <circle cx="41.7" cy="20.4" r="1.7" fill="#fff" />
            </g>

            <path
              d="M34.4 28.8h3.2c.8 0 1.1.9.5 1.4l-1.6 1.5c-.3.3-.7.3-1 0l-1.6-1.5c-.6-.5-.3-1.4.5-1.4Z"
              fill="var(--pet-nose)"
            />
            <path className="pet-smile" d="M33.2 33.4q2.8 2.4 5.6 0" />
          </g>
        </svg>
      </button>
    </div>
  )
}
