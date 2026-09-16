import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useTranslation } from '../lib/i18n'

/**
 * The owl — one small guide that rides along on every screen.
 *
 * It replaces `PetCompanion`, which was a cat that wandered across the viewport
 * and opened a ten-item menu. Two things changed on purpose:
 *
 * 1. **It stands still.** A buddy that walks out from under its own speech
 *    bubble is worse than no animation. Fixed bottom-right, above the nav bar.
 * 2. **It says where you are**, instead of listing where you could go. The menu
 *    moved to Home (which is now a how-to guide) and to /pet.
 *
 * Point 2 now has one exception. Fun Time and AI Support sit in the bubble,
 * because reaching a game used to cost six taps — notice the owl, tap it, read
 * the tip, leave for Home, find the buddy card, tap that, then pick. The owl is
 * on every screen; its two doors should be too. /pet is untouched and still the
 * page both games and the support chat link back to.
 *
 * Nothing else was let back in. The bubble holds exactly the two things that are
 * *not* on the way to anywhere — a break, and a way to report that the app
 * itself broke — and the line about where you currently are.
 */

interface Line {
  /** Longest match wins, so '/fun-time/speak' beats '/fun-time'. */
  path: string
  text: string
}

/**
 * One line per place. Written as something the owl would say about *this*
 * screen — if a line would make sense on any page, it is not doing its job.
 */
const LINES: Line[] = [
  { path: '/', text: "Four steps, in order. Start at one — I'll be here." },
  { path: '/pet', text: 'Two things live here — play with me, or tell me what broke.' },
  { path: '/fun-time', text: "You're in Fun Time — pick a game!" },
  { path: '/fun-time/spell', text: 'Read the clue, then spell it. I check against one fixed spelling.' },
  { path: '/fun-time/sentence', text: 'More than one word fits the gap. Only one fits the sentence.' },
  { path: '/fun-time/speak', text: "Say it out loud. I'm listening, not judging." },
  { path: '/fun-time/quiz', text: 'Every option sounds sensible. That is the whole test.' },
  { path: '/ai-support', text: 'Something broken? Tell me what happened and what you tapped.' },
  { path: '/lessons', text: 'Lectures, module by module. Watch one all the way through.' },
  { path: '/assignments', text: 'This week in one list. Start with the one closest to due.' },
  { path: '/feedback', text: 'A person wrote this, not me. Read the next step twice.' },
  { path: '/plan', text: 'Five small things, built from what your mentor actually wrote.' },
  { path: '/live', text: 'Lectures happen at a time. This is the one thing here you can miss.' },
  { path: '/practice', text: 'One word at a time. Nobody is counting but you.' },
  { path: '/progress', text: 'Effort, not marks. The numbers here are things you did.' },
  { path: '/leaderboard', text: 'Your college, ranked by effort. Video never leaves your account.' },
  { path: '/languages', text: 'Hindi or English — the lessons follow whichever you pick.' },
  { path: '/mentor', text: 'Your mentor is a person. Switching costs you none of your history.' },
  { path: '/account', text: 'Your data, your call. Export or delete it from here.' },
  { path: '/review', text: 'A student waited for this. Name one thing they did well.' },
  { path: '/profile', text: 'Students read this before they pick you.' },
]

const SIGNED_OUT = "I'm your study buddy. Sign in and I'll show you around."

function lineFor(pathname: string, signedIn: boolean): string {
  if (!signedIn) return SIGNED_OUT
  let best: Line | null = null
  for (const line of LINES) {
    const hit = pathname === line.path || pathname.startsWith(`${line.path}/`)
    if (!hit) continue
    if (!best || line.path.length > best.path.length) best = line
  }
  return best?.text ?? "Tap around — I'll tell you where you are."
}

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



export function MascotGuide() {
  const { me } = useAuth()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const reduced = useReducedMotion()
  const [open, setOpen] = useState(false)

  // Dragging state and position persistence
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = localStorage.getItem('skillflex_mascot_pos')
      if (saved) return JSON.parse(saved)
    } catch {}
    return null
  })

  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{
    startX: number
    startY: number
    initialLeft: number
    initialTop: number
    hasMoved: boolean
  } | null>(null)

  const preventClickRef = useRef(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const objectRef = useRef<HTMLObjectElement>(null)

  let text = lineFor(pathname, Boolean(me))
  if (pathname === '/account') text = t('mascot.account_line')
  else if (pathname === '/profile') text = t('mascot.profile_line')
  else if (pathname === '/lessons') text = t('mascot.lessons_line')
  else if (pathname === '/live') text = t('mascot.live_line')
  else if (!me) text = t('mascot.signed_out')

  const hasMenu = me?.role === 'student'

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const el = wrapRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: rect.left,
      initialTop: rect.top,
      hasMoved: false,
    }

    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {}
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY

    if (!dragRef.current.hasMoved && Math.hypot(dx, dy) > 5) {
      dragRef.current.hasMoved = true
      setIsDragging(true)
    }

    if (dragRef.current.hasMoved) {
      const width = wrapRef.current?.offsetWidth || 70
      const height = wrapRef.current?.offsetHeight || 70
      const pad = 12

      const nextX = Math.min(Math.max(pad, dragRef.current.initialLeft + dx), window.innerWidth - width - pad)
      const nextY = Math.min(Math.max(pad, dragRef.current.initialTop + dy), window.innerHeight - height - pad)

      setPosition({ x: nextX, y: nextY })
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const moved = dragRef.current.hasMoved

    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}

    dragRef.current = null
    setIsDragging(false)

    if (moved) {
      preventClickRef.current = true
      setTimeout(() => {
        preventClickRef.current = false
      }, 120)

      if (position) {
        try {
          localStorage.setItem('skillflex_mascot_pos', JSON.stringify(position))
        } catch {}
      }
    }
  }

  const resetPosition = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPosition(null)
    try {
      localStorage.removeItem('skillflex_mascot_pos')
    } catch {}
  }

  useEffect(() => {
    const el = objectRef.current
    if (!el) return
    const apply = () => {
      try {
        const doc = el.contentDocument?.documentElement as unknown as SVGSVGElement | undefined
        if (!doc?.pauseAnimations) return
        if (reduced) doc.pauseAnimations()
        else doc.unpauseAnimations()
      } catch {}
    }
    apply()
    el.addEventListener('load', apply)
    return () => el.removeEventListener('load', apply)
  }, [reduced])

  // Escape and outside-click close
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

  useEffect(() => setOpen(false), [pathname])

  // Compute directional placement for speech bubble when dragged
  const bubbleBelow = Boolean(position && position.y < 320)
  const bubbleLeft = Boolean(position && position.x < 320)

  return (
    <div
      ref={wrapRef}
      className={`pet-wrap${me ? '' : ' pet-wrap-bare'}${position ? ' pet-wrap-dragged' : ''}${
        isDragging ? ' pet-wrap-dragging' : ''
      }`}
      style={
        position
          ? {
              left: `${position.x}px`,
              top: `${position.y}px`,
            }
          : undefined
      }
    >
      {open && (
        <div
          className={`pet-bubble mascot-bubble${bubbleBelow ? ' mascot-bubble-below' : ''}${
            bubbleLeft ? ' mascot-bubble-left' : ''
          }`}
          role="dialog"
          aria-label={t('mascot.study_buddy')}
        >
          <div
            className="mascot-bubble-top"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            title="Drag to move buddy"
          >
            <div className="row" style={{ gap: '0.45rem', alignItems: 'center' }}>
              <span className="mascot-drag-grip" aria-hidden>
                ⋮⋮
              </span>
              <span className="mascot-badge">{t('mascot.study_buddy')}</span>
              {me && (
                <span className="buddy-status-pill">
                  <span className="status-live-dot" /> {t('mascot.online')}
                </span>
              )}
            </div>
            <div className="row" style={{ gap: '6px' }}>
              {position && (
                <button
                  type="button"
                  className="mascot-bubble-close"
                  onClick={resetPosition}
                  title="Snap back to default corner"
                  aria-label="Snap back to default corner"
                  style={{ fontSize: '11px', fontWeight: 800 }}
                >
                  ↩
                </button>
              )}
              <button
                type="button"
                className="mascot-bubble-close"
                onClick={() => setOpen(false)}
                aria-label={t('common.close')}
              >
                ✕
              </button>
            </div>
          </div>

          <div className="mascot-speech-text">{text}</div>

          {hasMenu && (
            <div className="buddy-menu">
              <Link to="/fun-time" className="buddy-item">
                <span className="buddy-item-icon buddy-item-fun" aria-hidden>
                  ⚔
                </span>
                <span className="buddy-item-body">
                  <span className="buddy-item-title">{t('mascot.fun_time')}</span>
                  <span className="buddy-item-blurb">{t('mascot.fun_time_desc')}</span>
                </span>
                <span className="buddy-item-go" aria-hidden>
                  →
                </span>
              </Link>
              <Link to="/ai-support" className="buddy-item">
                <span className="buddy-item-icon buddy-item-support" aria-hidden>
                  ☂
                </span>
                <span className="buddy-item-body">
                  <span className="buddy-item-title">{t('mascot.ai_support')}</span>
                  <span className="buddy-item-blurb">{t('mascot.ai_support_desc')}</span>
                </span>
                <span className="buddy-item-go" aria-hidden>
                  →
                </span>
              </Link>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        className={`mascot-btn${open ? ' mascot-btn-awake' : ''}`}
        aria-label={
          open
            ? 'Close the buddy'
            : hasMenu
              ? 'Your study buddy — open the menu'
              : 'Your study buddy — what is this page?'
        }
        aria-expanded={open}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={(e) => {
          if (preventClickRef.current) {
            e.preventDefault()
            e.stopPropagation()
            return
          }
          setOpen((v) => !v)
        }}
      >
        <div className="mascot-pedestal">
          <div className="mascot-glow-ambient" />
          <div id="mascot-container" data-mascot="guide">
            <object
              ref={objectRef}
              type="image/svg+xml"
              data="/assets/mascot/angry-owl.svg"
              aria-hidden="true"
              tabIndex={-1}
            />
          </div>
          <span className="mascot-presence-dot" title="Online" />
        </div>
      </button>
    </div>
  )
}
