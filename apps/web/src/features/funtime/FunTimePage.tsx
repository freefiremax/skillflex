import { Link } from 'react-router-dom'
import { BattleSummaryStats } from './GameBits'

interface Game {
  to: string
  icon: string
  title: string
  tag: string
  blurb: string
  tone: 'spell' | 'sentence' | 'speak' | 'quiz'
}

const GAMES: Game[] = [
  {
    to: '/fun-time/spell',
    icon: '✏️',
    title: 'Spell Check',
    tag: 'Spelling Drill',
    blurb: 'Read the clue, type the word. Instant feedback against a verified dictionary.',
    tone: 'spell',
  },
  {
    to: '/fun-time/sentence',
    icon: '✍️',
    title: 'Sentence Quiz',
    tag: 'Grammar Context',
    blurb: 'One word is missing. Pick the one the sentence grammatically and contextually needs.',
    tone: 'sentence',
  },
  {
    to: '/fun-time/speak',
    icon: '🎙️',
    title: 'Pronunciation Check',
    tag: 'Voice Practice',
    blurb: 'Say it out loud and see which syllable drifted — zero judgements, pure acoustic feedback.',
    tone: 'speak',
  },
  {
    to: '/fun-time/quiz',
    icon: '💡',
    title: 'Soft Skills Quiz',
    tag: 'Interview Scenarios',
    blurb: 'Realistic interview & GD challenges. Learn why the winning response works best.',
    tone: 'quiz',
  },
]

export default function FunTimePage() {
  return (
    <div className="funtime-container">
      <div className="funtime-header">
        <Link to="/pet" className="funtime-back-link">
          ← Back to Buddy
        </Link>
        <div>
          <span className="funtime-badge">🎮 Interactive Games</span>
          <h1 className="funtime-title">Fun Time</h1>
          <p className="funtime-sub">
            Fast drills that talk back. Every game judges against fixed answer keys — no AI grades
            you, and a win is simply getting every answer right.
          </p>
        </div>
      </div>

      <BattleSummaryStats />

      <div className="funtime-grid">
        {GAMES.map((g) => (
          <Link key={g.to} to={g.to} className={`funtime-card funtime-card-${g.tone}`}>
            <div className="funtime-card-top">
              <div className="funtime-card-icon" aria-hidden>
                {g.icon}
              </div>
              <span className="funtime-card-badge">{g.tag}</span>
            </div>
            <h2 className="funtime-card-title">{g.title}</h2>
            <p className="funtime-card-blurb">{g.blurb}</p>
            <div className="funtime-card-cta">
              <span>Start Drill</span>
              <div className="funtime-card-cta-arrow">→</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="funtime-notice">
        <span style={{ fontSize: '22px' }}>🌱</span>
        <span>
          Rounds played here build streaks and count towards your weekly effort on the leaderboard.
          They are completely private and never affect mentor ratings.
        </span>
      </div>
    </div>
  )
}

