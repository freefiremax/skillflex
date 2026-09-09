import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Card, ErrorNote, Loading } from '../../components/ui'

interface LeaderboardRow {
  studentId: string
  name: string
  score: number
  rank: number
  isYou: boolean
  facts: {
    wordsCleared: number
    streakDays: number
    submissionsCount: number
    liveAttended: number
    planItemsDone: number
    battlesWon: number
  }
}

interface Leaderboard {
  scopedTo: string | null
  you: { name: string; score: number; rank: number | null } | null
  peers: LeaderboardRow[]
  note: string
}

/**
 * The one feature allowed to be a "main" thing rather than a pet-widget item.
 * It exists to make effort visible to a college — and ONLY effort. This page
 * deliberately renders no rubric average, no mentor score, no "quality" number,
 * because the server never sends one. The note under the board says so too.
 */
export default function LeaderboardPage() {
  const board = useQuery({
    queryKey: ['progress-leaderboard'],
    queryFn: () => api.get<Leaderboard>('/progress/leaderboard'),
  })

  if (board.isLoading) return <Loading rows={3} />

  if (board.error) return <ErrorNote error={board.error} />

  const data = board.data

  if (!data || !data.scopedTo) {
    return (
      <div className="stack">
        <h1>Leaderboard</h1>
        <p className="small">{data?.note ?? 'No college to rank yet.'}</p>
      </div>
    )
  }

  const medal = (rank: number) =>
    rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`

  return (
    <div className="stack">
      <div>
        <h1>Top movers</h1>
        <p className="small">
          Effort across {data.scopedTo} — who cleared the most words, kept the longest streak, did the
          most work. It never ranks how good the work was; that stays between you and your mentor.
        </p>
      </div>

      <Card>
        {data.peers.length === 0 ? (
          <div className="tiny faint">No classmates to rank yet.</div>
        ) : (
          <div className="stack-sm">
            {data.peers.map((p) => (
              <div
                key={p.studentId}
                className={`row-between ${p.isYou ? 'you-row' : ''}`}
                style={{
                  padding: '0.45rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  background: p.isYou ? 'var(--surface-2)' : 'transparent',
                }}
              >
                <div className="row" style={{ flex: 1, minWidth: 0 }}>
                  <span className="mono strong" style={{ width: '2.2rem', flex: '0 0 auto' }}>
                    {medal(p.rank)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="small strong" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                      {p.isYou ? ' (you)' : ''}
                    </div>
                    <div className="tiny faint">
                      {p.facts.wordsCleared} words · {p.facts.streakDays} streak ·{' '}
                      {p.facts.submissionsCount} submissions
                    </div>
                  </div>
                </div>
                <span className="mono strong" style={{ color: 'var(--brand-deep)' }}>
                  {p.score}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="ai-note tiny dim">{data.note}</div>
    </div>
  )
}
