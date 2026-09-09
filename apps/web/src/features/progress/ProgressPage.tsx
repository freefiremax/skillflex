import { useQuery } from '@tanstack/react-query'
import type { LevelResult } from '@skillflex/shared'
import { api } from '../../lib/api'
import { Card, ErrorNote, Loading, Meter, Pill } from '../../components/ui'

/** What the server derives on read — never a stored value, never an AI score. */
interface ProgressMe {
  level: LevelResult
  effort: { score: number; facts: Record<string, number> }
  humanRubric: { score: number; feedbackCount: number }
  note: string
}

/**
 * The student's level, built from human mentor feedback plus what they actually
 * did. There is no "grade" column to show here, because none exists — the
 * server recomputes this from the same facts on every read, and the breakdown
 * is shown back so the student can see exactly where it came from.
 */
export default function ProgressPage() {
  const me = useQuery({
    queryKey: ['progress-me'],
    queryFn: () => api.get<ProgressMe>('/progress/me'),
  })

  const level = me.data?.level

  return (
    <div className="stack">
      <div>
        <h1>Your level</h1>
        <p className="small">
          A ladder built from your mentors’ feedback plus the work you actually put in. No AI
          computes it, and nothing here is stored — it’s re-derived every time you look.
        </p>
      </div>

      {me.isLoading ? (
        <Loading rows={3} />
      ) : me.error ? (
        <ErrorNote error={me.error} />
      ) : level ? (
        <>
          <Card accent>
            <div className="row-between" style={{ marginBottom: '0.4rem' }}>
              <span className="tiny faint">CURRENT LEVEL</span>
              <Pill tone="brand">{level.label}</Pill>
            </div>
            <div className="practice-stat" style={{ padding: 0, background: 'none', boxShadow: 'none', textAlign: 'left' }}>
              <b style={{ fontSize: '1.8rem' }}>{level.label}</b>
            </div>
            <div style={{ marginTop: '0.6rem' }}>
              <Meter value={level.progressPct} max={100} />
              <div className="tiny faint" style={{ marginTop: '0.35rem' }}>
                {level.nextLabel
                  ? `${level.progressPct}% of the way to ${level.nextLabel === 'god_mode' ? 'God Mode' : level.nextLabel}.`
                  : 'You’re at the top of the ladder.'}
              </div>
            </div>
          </Card>

          {/* Where the number comes from — shown, not assumed. */}
          <div className="section-title">Where this comes from</div>
          <Card>
            <div className="row-between" style={{ marginBottom: '0.3rem' }}>
              <span className="small strong">Human feedback</span>
              <span className="mono">{Math.round(level.breakdown.humanRubric.score)}/100</span>
            </div>
            <Meter value={level.breakdown.humanRubric.score} max={100} />
            <div className="tiny faint" style={{ marginTop: '0.35rem' }}>
              {level.breakdown.humanRubric.note}{' '}
              {me.data?.humanRubric.feedbackCount
                ? `(${me.data.humanRubric.feedbackCount} piece${me.data.humanRubric.feedbackCount > 1 ? 's' : ''} of mentor feedback)`
                : ''}
            </div>
          </Card>
          <Card>
            <div className="row-between" style={{ marginBottom: '0.3rem' }}>
              <span className="small strong">Effort</span>
              <span className="mono">{Math.round(level.breakdown.effort.score)}/100</span>
            </div>
            <Meter value={level.breakdown.effort.score} max={100} />
            <div className="tiny faint" style={{ marginTop: '0.35rem' }}>
              {level.breakdown.effort.note}
            </div>
          </Card>

          {/* The effort facts themselves, so "what did you do" is legible. */}
          <Card>
            <div className="tiny faint" style={{ marginBottom: '0.4rem' }}>
              YOUR EFFORT AT A GLANCE
            </div>
            <div className="practice-stats">
              <div className="practice-stat">
                <b className="mono">{me.data?.effort.facts.wordsCleared ?? 0}</b>
                <span className="tiny faint">words clear</span>
              </div>
              <div className="practice-stat">
                <b className="mono">{me.data?.effort.facts.streakDays ?? 0}</b>
                <span className="tiny faint">day streak</span>
              </div>
              <div className="practice-stat">
                <b className="mono">{me.data?.effort.facts.submissionsCount ?? 0}</b>
                <span className="tiny faint">submissions</span>
              </div>
            </div>
            <div className="practice-stats" style={{ marginTop: '0.5rem' }}>
              <div className="practice-stat">
                <b className="mono">{me.data?.effort.facts.liveAttended ?? 0}</b>
                <span className="tiny faint">lectures</span>
              </div>
              <div className="practice-stat">
                <b className="mono">{me.data?.effort.facts.planItemsDone ?? 0}</b>
                <span className="tiny faint">plan ticks</span>
              </div>
              <div className="practice-stat">
                <b className="mono">{me.data?.effort.facts.battlesWon ?? 0}</b>
                <span className="tiny faint">battles won</span>
              </div>
            </div>
          </Card>
        </>
      ) : null}

      {me.data?.note && <div className="ai-note tiny dim">{me.data.note}</div>}
    </div>
  )
}
