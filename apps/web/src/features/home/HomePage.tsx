import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useTranslation } from '../../lib/i18n'
import { Art, Card } from '../../components/ui'

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
 * So: the four loop doors are four numbered steps on a dashed rail, and the
 * other seven drop to a footer. Every line is a *how*. Trust claims are not
 * lost, they are stated where they are acted on — /progress says "No AI computes
 * it" in its own header, /mentor says switching is free on its own screen.
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
  /** Mechanical instruction — what you do, not why it is worth doing. */
  how: string
  /** Lives in public/assets/art/. Falls back to the glyph if absent. */
  art: string
  glyph: string
}



export default function HomePage() {
  const { me } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const steps: Step[] = [
    {
      to: '/lessons',
      title: t('home.watch_lesson'),
      how: t('home.watch_lesson_desc'),
      art: '/assets/art/step-lesson.png',
      glyph: '▶',
    },
    {
      to: '/assignments',
      title: t('home.record_task'),
      how: t('home.record_task_desc'),
      art: '/assets/art/step-record.png',
      glyph: '🎤',
    },
    {
      to: '/feedback',
      title: t('home.read_notes'),
      how: t('home.read_notes_desc'),
      art: '/assets/art/step-notes.png',
      glyph: '✎',
    },
    {
      to: '/plan',
      title: t('home.work_plan'),
      how: t('home.work_plan_desc'),
      art: '/assets/art/step-plan.png',
      glyph: '◎',
    },
  ]

  const chips = [
    { to: '/practice', label: t('home.practice_word') },
    { to: '/progress', label: t('home.your_level') },
    { to: '/leaderboard', label: t('home.leaderboard') },
    { to: '/languages', label: t('home.languages') },
    { to: '/mentor', label: t('home.your_mentor') },
  ]

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
      <div className="home-hero">
        <h1>
          {t('home.greeting')}, {me?.name?.split(' ')[0]} <span aria-hidden>👋</span>
        </h1>
        <p className="small" style={{ margin: 0 }}>
          {pending > 0
            ? `${pending} task${pending > 1 ? 's' : ''} waiting for you this week.`
            : awaiting > 0
              ? 'Your mentor is reviewing your work.'
              : 'All caught up. Watch a lesson and get ahead.'}
        </p>
        <div className="home-rule" />

        <div className="home-hero-body">
          <p className="home-quote" style={{ margin: 0 }}>
            {t('home.quote')}
          </p>

          <div className="home-hero-art">
            <div className="home-note" aria-hidden>
              Practice
              <br />
              Learn
              <br />
              Grow
              <u />
            </div>
            <Art src="/assets/art/hero.png" fallback="🧑‍💻" />
          </div>
        </div>
      </div>

      <div>
        <h2 style={{ marginBottom: '0.2rem' }}>How to use SkillFlex</h2>
        <p className="small" style={{ margin: 0 }}>
          Just 4 simple steps to make the most of your learning journey.
        </p>
      </div>

      <div className="howto-list">
        {steps.map((s, i) => (
          <div key={s.to} className={`howto-row howto-row-${i + 1}`}>
            {/* Not aria-hidden: the number *is* the information here, so a
                screen reader should hear "1 Watch a lesson". */}
            <span className="howto-num">{i + 1}</span>

            <Card
              className="howto-card"
              accent={s.to === '/assignments' && pending > 0}
              onClick={() => navigate(s.to)}
            >
              <span className="howto-tile">
                <Art src={s.art} fallback={s.glyph} />
              </span>
              <span>
                <span className="howto-title">
                  {s.title}
                  {badge[s.to] && <span className="door-badge">{badge[s.to]}</span>}
                </span>
                <span className="howto-how" style={{ display: 'block' }}>
                  {s.how}
                </span>
              </span>
              <span className="howto-chev" aria-hidden>
                ›
              </span>
            </Card>
          </div>
        ))}
      </div>

      <div className="home-close">
        <span className="home-close-art">
          <Art src="/assets/art/progress.png" fallback="📈" />
        </span>
        <div>
          <div className="home-close-title">
            Small steps.
            <br />
            Big progress.
          </div>
          <div className="tiny dim">Your mentor is with you at every step.</div>
        </div>
      </div>

      <div className="link-row link-row-lg">
        {chips.map((c) => (
          <Link key={c.to} to={c.to} className="link-chip">
            {c.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
