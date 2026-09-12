import { Link } from 'react-router-dom'
import { BattleSummaryStats } from './GameBits'

/**
 * Fun Time — the games hub.
 *
 * These four used to live behind a mode toggle on one page, which meant a game
 * could not be linked to, bookmarked, or reloaded without losing the round.
 * Each is now its own route with its own state; this page is just the door to
 * them, plus the running effort figures the games feed.
 */

interface Game {
  to: string
  icon: string
  title: string
  blurb: string
  /** Drives the tile's accent gradient — see .game-tile in global.css. */
  tone: 'spell' | 'sentence' | 'speak' | 'quiz'
}

const GAMES: Game[] = [
  {
    to: '/fun-time/spell',
    icon: '✏',
    title: 'Spell Check',
    blurb: 'Read the clue, type the word.',
    tone: 'spell',
  },
  {
    to: '/fun-time/sentence',
    icon: '§',
    title: 'Sentence Quiz',
    blurb: 'One word is missing. Pick the one the sentence needs.',
    tone: 'sentence',
  },
  {
    to: '/fun-time/speak',
    icon: '♪',
    title: 'Pronunciation Check',
    blurb: 'Say it out loud and see which syllable slipped.',
    tone: 'speak',
  },
  {
    to: '/fun-time/quiz',
    icon: '?',
    title: 'Soft Skills Quiz',
    blurb: 'Interview and group-discussion calls.',
    tone: 'quiz',
  },
]

export default function FunTimePage() {
  return (
    <div className="stack">
      <div>
        <Link to="/pet" className="back-link">
          ← Buddy
        </Link>
        <h1>Fun Time</h1>
        <p className="small">
          Quick drills that talk back. Every game judges against a fixed answer key — no AI scores
          you, and a win is just “everything right”.
        </p>
      </div>

      <BattleSummaryStats />

      <div className="grid-2">
        {GAMES.map((g) => (
          <Link key={g.to} to={g.to} className={`game-tile game-tile-${g.tone}`}>
            <span className="game-tile-icon" aria-hidden>
              {g.icon}
            </span>
            <span className="game-tile-title">{g.title}</span>
            <span className="game-tile-blurb">{g.blurb}</span>
          </Link>
        ))}
      </div>

      <p className="tiny faint">
        Rounds here count towards your effort on the leaderboard. They are never part of a mentor's
        feedback.
      </p>
    </div>
  )
}
