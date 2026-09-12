import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

/**
 * The owl — one small guide that rides along on every screen.
 *
 * It replaces `PetCompanion`, which was a cat that wandered across the viewport
 * and opened a ten-item menu. Two things changed on purpose:
 *
 * 1. **It stands still.** A buddy that walks out from under its own speech
 *    bubble is worse than no animation. Fixed bottom-right, above the nav bar.
 * 2. **It says where you are**, instead of listing where you could go. The menu
 *    moved to Home (which is now nothing but doors) and to /pet.
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
  const { pathname } = useLocation()
  const reduced = useReducedMotion()
  const [open, setOpen] = useState(false)

  const wrapRef = useRef<HTMLDivElement>(null)
  const objectRef = useRef<HTMLObjectElement>(null)

  const text = lineFor(pathname, Boolean(me))

  /**
   * The owl is an `<object>` rather than an `<img>` for one reason: the file
   * carries 22 `repeatCount="indefinite"` SMIL animations, and an `<img>` gives
   * no handle on them. `pauseAnimations()` on the embedded document is the only
   * way to honour prefers-reduced-motion without either inlining 288 KB into the
   * bundle or shipping a second, static copy of the drawing.
   *
   * Cross-origin would block `contentDocument`; this is same-origin from
   * `public/`, so it is readable. Wrapped anyway — a throw here would take the
   * whole shell down, and a mascot is not worth that.
   */
  useEffect(() => {
    const el = objectRef.current
    if (!el) return
    const apply = () => {
      try {
        const doc = el.contentDocument?.documentElement as unknown as SVGSVGElement | undefined
        if (!doc?.pauseAnimations) return
        if (reduced) doc.pauseAnimations()
        else doc.unpauseAnimations()
      } catch {
        /* embedded document not readable — leave it animating */
      }
    }
    apply()
    el.addEventListener('load', apply)
    return () => el.removeEventListener('load', apply)
  }, [reduced])

  // Escape and outside-click close, carried over from the cat.
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

  // A new page is a new thing to say, so the last page's bubble closes with it.
  useEffect(() => setOpen(false), [pathname])

  /*
   * Lottie, wired but not fired.
   * ---------------------------------------------------------------------------
   * `lottie-web` is declared in apps/web/package.json and the animation folder
   * exists at apps/web/public/assets/lottie/. When a real .json lands there,
   * delete the <object> below, uncomment this, and call it from an effect —
   * `#mascot-container` is unchanged either way, so nothing else moves.
   *
   * The import is dynamic so that until that day the library is in no chunk:
   * nothing references it at runtime, so Rollup never pulls it into the bundle.
   *
   * async function initLottie(container: HTMLElement, reduced: boolean) {
   *   const lottie = (await import('lottie-web')).default
   *   const anim = lottie.loadAnimation({
   *     container,
   *     renderer: 'svg',
   *     loop: true,
   *     autoplay: !reduced,
   *     path: '/assets/lottie/angry-owl.json',
   *   })
   *   return () => anim.destroy()
   * }
   */

  return (
    <div ref={wrapRef} className={`pet-wrap${me ? '' : ' pet-wrap-bare'}`}>
      {open && (
        <div className="pet-bubble mascot-bubble pet-menu" role="dialog" aria-label="Pet menu">
          <div className="tiny strong mascot-bubble-who">YOUR BUDDY</div>
          <div className="small">{text}</div>
          <div className="pet-menu-actions">
            <NavLink to="/fun-time" className="pet-menu-option" onClick={() => setOpen(false)}>
              <span aria-hidden="true">⚔</span>
              <span>Fun Time</span>
            </NavLink>
            <NavLink to="/ai-support" className="pet-menu-option" onClick={() => setOpen(false)}>
              <span aria-hidden="true">☂</span>
              <span>AI Support</span>
            </NavLink>
          </div>
        </div>
      )}

      <button
        type="button"
        className={`mascot-btn${open ? ' mascot-btn-awake' : ''}`}
        aria-label={open ? 'Hide the buddy’s tip' : 'Your study buddy — what is this page?'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div id="mascot-container" data-mascot="guide">
          <object
            ref={objectRef}
            type="image/svg+xml"
            data="/assets/mascot/angry-owl.svg"
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>
      </button>
    </div>
  )
}
