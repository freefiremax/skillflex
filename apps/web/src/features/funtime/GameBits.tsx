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
    <div className="funtime-header">
      <Link to="/fun-time" className="funtime-back-link">
        ← Back to Fun Time
      </Link>
      <div>
        <h1 className="funtime-title" style={{ fontSize: 'clamp(30px, 4vw, 42px)' }}>
          {title}
        </h1>
        <p className="funtime-sub">{blurb}</p>
      </div>
    </div>
  )
}

export function RoundHeader({ mode, index, total }: { mode: string; index: number; total: number }) {
  const pct = Math.round(((index) / total) * 100)
  return (
    <div className="game-progress-header">
      <div className="row-between" style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '99px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#6028c7',
              background: 'rgba(112, 68, 214, 0.1)',
              border: '1px solid rgba(112, 68, 214, 0.15)',
            }}
          >
            {mode}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
            Round {index + 1} of {total}
          </span>
        </div>
        <span style={{ fontSize: '13px', fontWeight: 750, color: 'var(--brand-deep)', fontFamily: 'monospace' }}>
          {pct}%
        </span>
      </div>
      <div className="game-progress-bar-bg">
        <div className="game-progress-bar-fill" style={{ width: `${Math.max(pct, 5)}%` }} />
      </div>
    </div>
  )
}

export function VerdictChip({ verdict }: { verdict: Verdict }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 14px',
        borderRadius: '99px',
        fontSize: '13px',
        fontWeight: 800,
        background:
          verdict === 'correct'
            ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)'
            : 'linear-gradient(135deg, #fee2e2, #fecaca)',
        color: verdict === 'correct' ? '#047857' : '#b91c1c',
        border: `1px solid ${verdict === 'correct' ? '#86efac' : '#fca5a5'}`,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      }}
    >
      {verdict === 'correct' ? '✓ Right!' : '✕ Not quite'}
    </span>
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
    <div className="game-glass-deck game-done-card">
      <div className="game-done-trophy">
        {perfect ? '🏆' : score > 0 ? '⭐' : '🌱'}
      </div>

      <h2 style={{ fontSize: '26px', fontWeight: 850, margin: '0 0 6px', color: '#1e1433' }}>
        {perfect ? 'Perfect Round!' : 'Round Completed!'}
      </h2>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '99px',
          background: perfect ? 'rgba(16, 185, 129, 0.12)' : 'rgba(112, 68, 214, 0.1)',
          border: `1px solid ${perfect ? 'rgba(16, 185, 129, 0.25)' : 'rgba(112, 68, 214, 0.2)'}`,
          margin: '0 auto 16px',
        }}
      >
        <span style={{ fontSize: '18px', fontWeight: 900, color: perfect ? '#059669' : 'var(--brand-deep)' }}>
          {score} / {total} correct
        </span>
      </div>

      <div style={{ fontSize: '15px', lineHeight: 1.5, color: '#526173', maxWidth: '480px', margin: '0 auto 24px' }}>
        {children}
      </div>

      <div style={{ display: 'grid', gap: '10px', maxWidth: '320px', margin: '0 auto' }}>
        <button
          type="button"
          onClick={onRestart}
          style={{
            padding: '14px 20px',
            borderRadius: '16px',
            fontWeight: 800,
            fontSize: '15px',
            color: '#fff',
            background: 'linear-gradient(135deg, #8e65f3 0%, #683cd4 100%)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 6px 20px rgba(104, 60, 212, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Play Again
        </button>
        <Link
          to="/fun-time"
          style={{
            padding: '12px 20px',
            borderRadius: '16px',
            fontWeight: 700,
            fontSize: '14px',
            color: 'var(--brand-deep)',
            background: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid rgba(112, 68, 214, 0.15)',
            textDecoration: 'none',
            display: 'block',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
            transition: 'all 0.2s ease',
          }}
        >
          Pick Another Game
        </Link>
      </div>
    </div>
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
    <div className="funtime-stats-deck">
      <div className="funtime-stat-glass">
        <div className="funtime-stat-icon">🎮</div>
        <div className="funtime-stat-info">
          <span className="funtime-stat-num">{s.rounds}</span>
          <span className="funtime-stat-label">Rounds Played</span>
        </div>
      </div>
      <div className="funtime-stat-glass">
        <div className="funtime-stat-icon">🏆</div>
        <div className="funtime-stat-info">
          <span className="funtime-stat-num">{s.wins}</span>
          <span className="funtime-stat-label">Perfect Rounds</span>
        </div>
      </div>
      <div className="funtime-stat-glass">
        <div className="funtime-stat-icon">⚡</div>
        <div className="funtime-stat-info">
          <span className="funtime-stat-num">{s.best}</span>
          <span className="funtime-stat-label">Best Score</span>
        </div>
      </div>
    </div>
  )
}

