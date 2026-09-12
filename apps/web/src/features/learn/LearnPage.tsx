import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Card, Pill } from '../../components/ui'

/**
 * Home — doors, and nothing else.
 *
 * This page used to carry the greeting, the mentor card, the next lecture, all
 * of this week's assignments, six nav cards *and* the entire lesson tree in one
 * scroll. Every one of those things has a page of its own, so the ones that were
 * inlined here (`This week` → /assignments, `Lessons` → /lessons) moved out and
 * Home became what its name implies: a place you pass through.
 *
 * The one query left is the task count, because "3 waiting" is the only thing
 * that changes which door you should pick first.
 */

interface WeekAssignment {
  status: string
  hasFeedback: boolean
}

interface Door {
  to: string
  eyebrow: string
  title: string
  blurb: string
  cta: string
}

const DOORS: Door[] = [
  {
    to: '/assignments',
    eyebrow: 'THIS WEEK',
    title: 'Your tasks',
    blurb: 'What your mentor set, and where to record it.',
    cta: '● Open',
  },
  {
    to: '/lessons',
    eyebrow: 'WATCH',
    title: 'Lessons',
    blurb: 'The full track — videos, module by module.',
    cta: '▶ Browse',
  },
  {
    to: '/live',
    eyebrow: 'HAPPENS AT A TIME',
    title: 'Live lectures',
    blurb: 'Sessions with a real mentor. The one thing here you can miss.',
    cta: '◉ See',
  },
  {
    to: '/feedback',
    eyebrow: 'FROM A PERSON',
    title: 'Mentor feedback',
    blurb: 'What a human wrote about your work, with the next step.',
    cta: '✎ Read',
  },
  {
    to: '/plan',
    eyebrow: 'THIS WEEK',
    title: 'Your plan',
    blurb: "Five small things, built from your mentor's own words.",
    cta: '✓ Open',
  },
  {
    to: '/pet',
    eyebrow: 'PLAY OR ASK',
    title: 'Your buddy',
    blurb: 'Fun Time games, and support when something in the app breaks.',
    cta: '☺ Say hi',
  },
  {
    to: '/practice',
    eyebrow: 'TWO-MINUTE DRILL',
    title: 'Practise a word',
    blurb: 'Say it out loud, see which syllable slipped. Not scored, not seen.',
    cta: '♪ Start',
  },
  {
    to: '/progress',
    eyebrow: 'YOUR LEVEL',
    title: 'Beginner → God Mode',
    blurb: 'Built from mentor feedback plus what you did. No AI computes it.',
    cta: '◎ See it',
  },
  {
    to: '/leaderboard',
    eyebrow: 'YOUR COLLEGE',
    title: 'Top movers',
    blurb: 'Effort across your college. It never ranks quality.',
    cta: '★ Board',
  },
  {
    to: '/languages',
    eyebrow: 'SAY SOMETHING NEW',
    title: 'Learn a language',
    blurb: 'Spanish, French, German, Japanese, Korean — phrases you can echo.',
    cta: '語 Start',
  },
  {
    to: '/mentor',
    eyebrow: 'YOUR MENTOR',
    title: 'Who you work with',
    blurb: 'See them, or switch. Switching costs you none of your history.',
    cta: '☺ Open',
  },
]

export default function LearnPage() {
  const { me } = useAuth()
  const navigate = useNavigate()

  const week = useQuery({
    queryKey: ['my-week'],
    queryFn: () => api.get<{ assignments: WeekAssignment[] }>('/curriculum/my-week'),
  })

  const all = week.data?.assignments ?? []
  const pending = all.filter((a) => a.status === 'not_started').length
  const awaiting = all.filter((a) => ['submitted', 'in_review'].includes(a.status)).length
  const unread = all.filter((a) => a.hasFeedback).length

  /** Only counts that change what you'd tap next earn a badge. */
  const badge: Record<string, string | undefined> = {
    '/assignments': pending > 0 ? `${pending} waiting` : awaiting > 0 ? 'in review' : undefined,
    '/feedback': unread > 0 ? `${unread} ready` : undefined,
  }

  return (
    <div className="stack">
      <div>
        <h1>Namaste, {me?.name?.split(' ')[0]}</h1>
        <p className="small">
          {pending > 0
            ? `${pending} task${pending > 1 ? 's' : ''} waiting for you this week.`
            : awaiting > 0
              ? 'Your mentor is reviewing your work.'
              : 'All caught up. Watch a lesson and get ahead.'}
        </p>
      </div>

      {DOORS.map((d) => (
        <Card key={d.to} accent={d.to === '/assignments' && pending > 0} onClick={() => navigate(d.to)}>
          <div className="row-between">
            <div>
              <div className="tiny faint">
                {d.eyebrow}
                {badge[d.to] && <span className="door-badge">{badge[d.to]}</span>}
              </div>
              <div className="strong">{d.title}</div>
              <div className="tiny dim">{d.blurb}</div>
            </div>
            <Pill tone="brand">{d.cta}</Pill>
          </div>
        </Card>
      ))}
    </div>
  )
}
