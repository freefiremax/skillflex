import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Card, formatRelative } from '../../components/ui'

/**
 * The buddy screen — two doors, nothing else.
 *
 * This used to be a floating menu of ten links hanging off the cat. That made
 * the pet the app's junk drawer: anything without a nav slot ended up in it.
 * The ten links now live on Home, and this screen has one job — play, or get
 * help — so the choice is legible at a glance on a phone.
 *
 * The plan and next-lecture lines below are what the cat's bubble used to show.
 * They share the `['plan-current']` and `['live-next']` query keys with PlanPage
 * and LiveBits, so arriving here after either costs no extra request.
 */

interface PlanItem {
  title: string
  why: string
  done: boolean
}

interface PlanResponse {
  plan: { id: string; items: PlanItem[] } | null
  message?: string
}

interface NextLive {
  id: string
  title: string
  status: string
  scheduledAt: string
}

export default function PetPage() {
  const plan = useQuery({
    queryKey: ['plan-current'],
    queryFn: () => api.get<PlanResponse>('/plans/current'),
  })

  const live = useQuery({
    queryKey: ['live-next'],
    queryFn: () => api.get<{ class: NextLive | null }>('/live/next'),
  })

  const items = plan.data?.plan?.items ?? []
  const done = items.filter((i) => i.done).length
  const nextLive = live.data?.class ?? null

  return (
    <div className="stack">
      <div>
        <h1>Your buddy</h1>
        <p className="small">Two things live here. Play with me, or tell me what's broken.</p>
      </div>

      <div className="grid-2">
        <Link to="/fun-time" className="tile-xl tile-fun">
          <span className="tile-xl-icon" aria-hidden>
            ⚔
          </span>
          <span className="tile-xl-title">Fun Time</span>
          <span className="tile-xl-blurb">
            Four quick games — spelling, sentences, saying it out loud, and interview calls.
          </span>
          <span className="tile-xl-cta">Pick a game →</span>
        </Link>

        <Link to="/ai-support" className="tile-xl tile-support">
          <span className="tile-xl-icon" aria-hidden>
            ☂
          </span>
          <span className="tile-xl-title">AI Support</span>
          <span className="tile-xl-blurb">
            Something not loading, mic not working, can't find your feedback? Ask here.
          </span>
          <span className="tile-xl-cta">Report an issue →</span>
        </Link>
      </div>

      {/* The two things the old pet bubble surfaced, kept because they are
          time-bound: a lecture can be missed and a plan runs out on Sunday. */}
      {(items.length > 0 || nextLive) && (
        <Card>
          {nextLive && (
            <Link to={`/live/${nextLive.id}`} className="row-between" style={{ marginBottom: items.length ? '0.6rem' : 0 }}>
              <span className="small strong">
                {nextLive.status === 'live' && <span className="rec-dot" />}
                {nextLive.status === 'live' ? 'Live now: ' : 'Next lecture: '}
                {nextLive.title}
              </span>
              <span className="tiny faint">
                {nextLive.status === 'live' ? 'tap to join' : formatRelative(nextLive.scheduledAt)}
              </span>
            </Link>
          )}
          {items.length > 0 && (
            <Link to="/plan" className="row-between">
              <span className="small strong">This week's plan</span>
              <span className="tiny faint">
                {done === items.length ? 'all done ✓' : `${done} of ${items.length} done →`}
              </span>
            </Link>
          )}
        </Card>
      )}
    </div>
  )
}
