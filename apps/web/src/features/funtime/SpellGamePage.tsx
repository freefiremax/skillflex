import { useRef, useState } from 'react'
import { SPELLING_WORDS } from '@skillflex/shared'
import { speakWord } from '../../lib/useSpeechRecognition'
import { Card, ErrorNote } from '../../components/ui'
import {
  GameHeader,
  RoundDone,
  RoundHeader,
  VerdictChip,
  react,
  useLogBattle,
  type Verdict,
} from './GameBits'

/**
 * Spell Check — read the clue, type the word.
 *
 * Judged by a string compare against a fixed spelling, so nothing here is a
 * machine's opinion of the student. The round records score/total, which is a
 * count of correct answers and not a grade.
 */
export default function SpellGamePage() {
  const log = useLogBattle('spelling')
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [input, setInput] = useState('')
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [lastVoice, setLastVoice] = useState('')
  const [finished, setFinished] = useState(false)

  const startRef = useRef(Date.now())

  const words = SPELLING_WORDS
  const total = words.length
  const word = words[index]!

  const check = (e: React.FormEvent) => {
    e.preventDefault()
    if (verdict) return
    const ok = input.trim().toLowerCase() === word.word.toLowerCase()
    setVerdict(ok ? 'correct' : 'wrong')
    if (ok) setScore((s) => s + 1)
    setLastVoice(react(ok ? 'correct' : 'wrong', lastVoice))
  }

  const next = () => {
    if (index + 1 >= total) {
      const duration = Math.round((Date.now() - startRef.current) / 1000)
      setFinished(true)
      log.mutate({ mode: 'spelling', score, total, durationSeconds: duration })
      setLastVoice(react('round'))
      setInput('')
      setVerdict(null)
    } else {
      setIndex((i) => i + 1)
      setInput('')
      setVerdict(null)
    }
  }

  const restart = () => {
    setIndex(0)
    setScore(0)
    setFinished(false)
    setVerdict(null)
    setInput('')
    startRef.current = Date.now()
  }

  return (
    <div className="funtime-container">
      <GameHeader
        title="Spell Check"
        blurb="A clue, then the word. Checked against one verified spelling — right or not right, nothing in between."
      />

      {finished ? (
        <RoundDone score={score} total={total} onRestart={restart}>
          {score === total
            ? 'Every word right. That’s a perfect round.'
            : 'Every one of those was against a fixed spelling. Try the next round.'}
        </RoundDone>
      ) : (
        <div className="game-glass-deck">
          <RoundHeader mode="Spelling" index={index} total={total} />

          <div className="game-clue-plate">
            <span
              style={{
                display: 'inline-block',
                fontSize: '12px',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: '#6d28d9',
                letterSpacing: '0.06em',
                marginBottom: '8px',
              }}
            >
              💡 Clue
            </span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e1433', lineHeight: 1.45 }}>
              {word.clue}
            </div>
          </div>

          <form onSubmit={check} style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
            <input
              className="game-input-glass"
              aria-label="Type the word"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Spell the word here…"
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              disabled={verdict !== null}
            />
            <button
              type="submit"
              disabled={verdict !== null || !input.trim()}
              style={{
                padding: '0 24px',
                borderRadius: '16px',
                fontWeight: 800,
                fontSize: '15px',
                color: '#fff',
                background: 'linear-gradient(135deg, #8e65f3, #683cd4)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 14px rgba(104, 60, 212, 0.3)',
                cursor: 'pointer',
                opacity: verdict !== null || !input.trim() ? 0.6 : 1,
              }}
            >
              Check
            </button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
            <button
              type="button"
              onClick={() => speakWord(word.word)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '99px',
                background: 'rgba(255, 255, 255, 0.85)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                color: 'var(--brand-deep)',
                fontWeight: 750,
                fontSize: '13px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                cursor: 'pointer',
              }}
            >
              🔊 Hear word spoken
            </button>
          </div>

          {verdict && (
            <div className="game-why-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <VerdictChip verdict={verdict} />
                {verdict === 'wrong' && (
                  <span style={{ fontSize: '14px', color: '#475569' }}>
                    The correct spelling is <strong style={{ color: '#1e1433' }}>{word.word}</strong>
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={next}
                style={{
                  padding: '10px 20px',
                  borderRadius: '14px',
                  fontWeight: 800,
                  fontSize: '14px',
                  color: '#fff',
                  background: 'linear-gradient(135deg, #8e65f3, #683cd4)',
                  border: 'none',
                  boxShadow: '0 4px 14px rgba(104, 60, 212, 0.25)',
                  cursor: 'pointer',
                }}
              >
                {index + 1 >= total ? 'Finish round →' : 'Next word →'}
              </button>
            </div>
          )}
          <ErrorNote error={log.error} />
        </div>
      )}
    </div>
  )
}
