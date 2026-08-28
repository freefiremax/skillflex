import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

interface PlanItem {
  title: string
  why: string
  done: boolean
}

interface PlanResponse {
  plan: { id: string; items: PlanItem[] } | null
  message?: string
}

/** Roaming range, as a percentage of the viewport width. Kept off both edges so
 *  the pet never clips and the bubble always has room to open. */
const MIN_X = 6
const MAX_X = 84

/** Milliseconds per 1% of screen travelled — a constant walking speed, so
 *  crossing the whole screen takes longer than a short shuffle. */
const MS_PER_PERCENT = 95

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
  const doneCount = (plan?.items.length ?? 0) - todo.length

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
          aria-label={isStudent ? "This week's plan" : 'Your study buddy'}
        >
          <div className="tiny strong" style={{ color: 'var(--accent)' }}>
            {isStudent ? "THIS WEEK'S PLAN" : 'YOUR STUDY BUDDY'}
          </div>

          {!isStudent ? (
            <div className="tiny dim">
              {me
                ? "I look after weekly plans. Students get one built from their mentor's own words."
                : "Sign in and I'll keep this week's plan right here — built from what your mentor actually wrote."}
            </div>
          ) : isLoading ? (
            <div className="tiny dim">Fetching your plan…</div>
          ) : isError ? (
            <div className="tiny dim">Couldn't load your plan just now.</div>
          ) : !plan ? (
            <div className="tiny dim">
              {data?.message ?? 'Your plan appears once a mentor reviews your work.'}
            </div>
          ) : todo.length === 0 ? (
            <div className="tiny dim">All {plan.items.length} done. Nicely cleared. ✓</div>
          ) : (
            <>
              {/* Three is what fits without the bubble becoming a page of its
                  own — the rest are one tap away. */}
              <ul className="pet-list">
                {todo.slice(0, 3).map((item) => (
                  <li key={item.title}>{item.title}</li>
                ))}
              </ul>
              {todo.length > 3 && (
                <div className="tiny faint">+{todo.length - 3} more</div>
              )}
              {doneCount > 0 && (
                <div className="tiny faint">
                  {doneCount}/{plan.items.length} already done
                </div>
              )}
            </>
          )}

          {isStudent && (
            <Link to="/plan" className="tiny strong" onClick={() => setOpen(false)}>
              See full plan →
            </Link>
          )}
        </div>
      )}

      <button
        type="button"
        className={`pet${open ? ' pet-awake' : ''}`}
        aria-label={isStudent ? "Your study buddy — show this week's plan" : 'Your study buddy'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{ transform: `scaleX(${pos.facing})` }}
      >
        <svg className="pet-svg" viewBox="0 0 64 56" aria-hidden="true">
          <defs>
            <linearGradient id="petGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--brand)" />
              <stop offset="100%" stopColor="var(--accent)" />
            </linearGradient>
          </defs>
          <ellipse className="pet-foot" cx="24" cy="50" rx="7" ry="4" />
          <ellipse className="pet-foot" cx="40" cy="50" rx="7" ry="4" />
          <path
            className="pet-shape"
            d="M32 4C16 4 6 15 6 30c0 12 11 20 26 20s26-8 26-20C58 15 48 4 32 4Z"
            fill="url(#petGrad)"
          />
          <ellipse className="pet-eye" cx="23" cy="27" rx="3.2" ry="4" />
          <ellipse className="pet-eye" cx="41" cy="27" rx="3.2" ry="4" />
          <path className="pet-smile" d="M26 36q6 5 12 0" />
        </svg>
      </button>
    </div>
  )
}
