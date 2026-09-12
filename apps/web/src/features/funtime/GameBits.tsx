import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CHEER_VOICES,
  ENCOURAGE_VOICES,
  ROUND_WRAPPERS,
  pickVoice,
} from '@skillflex/shared'
import { api } from '../../lib/api'
import { speak } from '../../lib/useSpeechRecognition'
import { Card, Pill } from '../../components/ui'

/**
 * Pieces shared by the four Fun Time games, in the same spirit as
 * features/live/LiveBits.tsx.
 *
 * These used to be private helpers inside one 644-line BattlePage where all four
 * games lived behind a mode toggle. Each game is now its own route — its own URL,
 * its own round state, survivable across a reload — so the parts they genuinely
 * share moved here rather than being copied four times.
 */

export type Verdict = 'correct' | 'wrong'

/** The only three modes the API stores. Pronunciation logs to /practice instead. */
export type BattleMode = 'spelling' | 'sentence' | 'quiz'

export interface BattleAttempt {
  mode: BattleMode
  score: number
  total: number
  durationSeconds: number
}

interface Summary {
  summary: {
    rounds: number
    wins: number
    best: number
    byMode: Record<string, number>
    note: string
  }
}

/** Speak a cheer or an "aww" out loud. The voice is the device's own — free,
 *  offline, and the same trick the drill uses to say the word. */
export function react(kind: 'correct' | 'wrong' | 'round', avoid?: string) {
  const pool =
    kind === 'correct' ? CHEER_VOICES : kind === 'wrong' ? ENCOURAGE_VOICES : ROUND_WRAPPERS
  const text = pickVoice(pool, avoid)
  speak(text)
  return text
}

/** Title, one line of scope, and the way back. No game is a dead end. */
export function GameHeader({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div>
      <Link to="/fun-time" className="back-link">
        ← Fun Time
      </Link>
      <h1>{title}</h1>
      <p className="small">{blurb}</p>
    </div>
  )
}

export function RoundHeader({ mode, index, total }: { mode: string; index: number; total: number }) {
  return (
    <div className="row-between" style={{ marginBottom: '0.6rem' }}>
      <span className="tiny faint">
        {mode.toUpperCase()} · ROUND {index + 1} OF {total}
      </span>
      <span className="tiny faint mono">{(index / total) * 100}%</span>
    </div>
  )
}

export function VerdictChip({ verdict }: { verdict: Verdict }) {
  return (
    <Pill tone={verdict === 'correct' ? 'ok' : 'warn'}>
      {verdict === 'correct' ? 'Right!' : 'Not quite'}
    </Pill>
  )
}

/**
 * The end-of-round card. Identical in all four games apart from one line of
 * copy, so the copy is the parameter.
 */
export function RoundDone({
  score,
  total,
  children,
  onRestart,
}: {
  score: number
  total: number
  children: ReactNode
  onRestart: () => void
}) {
  const perfect = score === total
  return (
    <Card>
      <div className="row-between" style={{ marginBottom: '0.4rem' }}>
        <div className="strong">
          Round done — {score}/{total}
        </div>
        <Pill tone={perfect ? 'ok' : 'default'}>{perfect ? 'Perfect' : 'Nice go'}</Pill>
      </div>
      <div className="small" style={{ marginBottom: '0.6rem' }}>
        {children}
      </div>
      <button className="btn btn-block" type="button" onClick={onRestart}>
        Play again
      </button>
      <Link to="/fun-time" className="btn btn-ghost btn-block" style={{ marginTop: '0.5rem' }}>
        Pick another game
      </Link>
    </Card>
  )
}

/**
 * Logs one finished round. Unchanged from the BattlePage version on purpose:
 * `POST /battles/attempts` feeds the college leaderboard's effort score, so the
 * extraction into routes must not alter what gets recorded.
 */
export function useLogBattle(_mode: BattleMode) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: BattleAttempt) => api.post('/battles/attempts', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['battle-summary'] }),
  })
}

export function BattleSummaryStats() {
  const summary = useQuery({
    queryKey: ['battle-summary'],
    queryFn: () => api.get<Summary>('/battles/summary'),
  })
  const s = summary.data?.summary
  if (!s) return null
  return (
    <div className="practice-stats">
      <div className="practice-stat">
        <b className="mono">{s.rounds}</b>
        <span className="tiny faint">rounds played</span>
      </div>
      <div className="practice-stat">
        <b className="mono">{s.wins}</b>
        <span className="tiny faint">perfect rounds</span>
      </div>
      <div className="practice-stat">
        <b className="mono">{s.best}</b>
        <span className="tiny faint">best score</span>
      </div>
    </div>
  )
}
