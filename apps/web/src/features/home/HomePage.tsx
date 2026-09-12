import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Card, Pill } from '../../components/ui'

/**
 * Home — how to use SkillFlex, in four steps.
 *
 * This page used to carry the greeting, the mentor card, the next lecture, all
 * of this week's assignments, six nav cards *and* the entire lesson tree in one
 * scroll. Every one of those things has a page of its own, so the ones that were
 * inlined here moved out and Home became eleven flat doors.
 *
 * Eleven doors was still the wrong shape. Their copy answered *why* to tap them
 * — "It never ranks quality", "No AI computes it", "Switching costs you none of
 * your history" — all true, and none of it any use to someone who has just
 * signed in and wants to know what to do first. Worse, nothing was ordered, so
 * the one sequence that matters (watch a lesson, record an answer, read what
 * your mentor wrote, work the plan it produced) looked like four unrelated
 * places among eleven.
 *
 * So: the four loop doors are now four numbered steps that name their tap target
 * literally, and the other seven drop to a second tier. Every line is a *how*.
 * Trust claims are not lost, they are just stated where they are acted on —
 * /progress says "No AI computes it" in its own header, /mentor says switching
 * is free on its own screen.
 *
 * The guide shows for everyone, always. A Home that changes shape once you stop
 * being new is a Home you have to learn twice.
 *
 * The one query left is the task count, because "2 waiting" is the only thing
 * that changes which step you should be on.
 */

interface WeekAssignment {
  status: string
  hasFeedback: boolean
}

interface Step {
  to: string
  title: string
  /** Mechanical instruction. Names the control, in the words on the control. */
  how: string
}

/**
 * Steps 1, 3 and 4 name real bottom-nav tabs. Step 2 deliberately does not:
 * /assignments has no tab (see STUDENT_NAV in AppShell), so telling a new user
 * to look for one would send them hunting for something that is not there.
 *
 * "Record my answer" is quoted exactly as AssignmentsPage renders it. An
 * instruction that paraphrases a button stops being an instruction.
 */
const STEPS: Step[] = [
  {
    to: '/lessons',
    title: 'Watch a lesson',
    how: 'Tap Lessons in the bar at the bottom. Pick any video and play it to the end.',
  },
  {
    to: '/assignments',
    title: 'Record your answer',
    how: 'Tap this step to open your tasks. Open one, then tap “Record my answer” and speak into your phone.',
  },
  {
    to: '/feedback',
    title: "Read your mentor's notes",
    how: 'Tap Feedback in the bottom bar. Notes land a day or two after you record — a person writes them, so they are not instant.',
  },
  {
    to: '/plan',
    title: 'Work through your plan',
    how: 'Tap Plan in the bottom bar. Five small things built from those notes. Tick each one off as you do it.',
  },
]

/** The two off-loop places a new user would not otherwise find. */
const EXTRAS = [
  {
    to: '/live',
    title: 'Live lectures',
    how: 'These happen at a set time. Open it to see when the next one is, and tap in when it starts.',
    cta: '◉ See',
  },
  {
    to: '/pet',
    title: 'Your buddy',
    how: 'The owl in the bottom right corner. Its page has four games, and a chat for when the app itself breaks.',
    cta: '☺ Open',
  },
]

/** Self-explanatory once you know they exist. Labelled with their own names. */
const CHIPS = [
  { to: '/practice', label: 'Practise a word' },
  { to: '/progress', label: 'Your level' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/languages', label: 'Languages' },
  { to: '/mentor', label: 'Your mentor' },
]

export default function HomePage() {
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

  /** Only counts that change which step you are on earn a badge. */
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

      <div className="section-title" style={{ marginTop: 0 }}>
        How to use SkillFlex
      </div>

      {STEPS.map((s, i) => (
        <Card key={s.to} accent={s.to === '/assignments' && pending > 0} onClick={() => navigate(s.to)}>
          <div className="howto-step">
            {/* Not aria-hidden: the number *is* the information here, so a
                screen reader should hear "1 Watch a lesson". */}
            <span className="howto-num">{i + 1}</span>
            <div>
              <div className="strong">
                {s.title}
                {badge[s.to] && <span className="door-badge">{badge[s.to]}</span>}
              </div>
              <div className="tiny dim">{s.how}</div>
            </div>
          </div>
        </Card>
      ))}

      <div className="section-title">Everything else</div>

      {EXTRAS.map((e) => (
        <Card key={e.to} onClick={() => navigate(e.to)}>
          <div className="row-between">
            <div>
              <div className="strong">{e.title}</div>
              <div className="tiny dim">{e.how}</div>
            </div>
            <Pill tone="brand">{e.cta}</Pill>
          </div>
        </Card>
      ))}

      <div className="link-row link-row-lg">
        {CHIPS.map((c) => (
          <Link key={c.to} to={c.to} className="link-chip">
            {c.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
