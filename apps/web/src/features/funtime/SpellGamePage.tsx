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
    <div className="stack">
      <GameHeader
        title="Spell Check"
        blurb="A clue, then the word. Checked against one fixed spelling — right or not right, nothing in between."
      />

      {finished ? (
        <RoundDone score={score} total={total} onRestart={restart}>
          {score === total
            ? 'Every word right. That’s a perfect round.'
            : 'Every one of those was against a fixed spelling. Try the next round.'}
        </RoundDone>
      ) : (
        <Card>
          <RoundHeader mode="Spelling" index={index} total={total} />

          <div
            className="word-plate"
            style={{ fontSize: '1.1rem', minHeight: 0, padding: '0.9rem 0.75rem' }}
          >
            <span className="hint" style={{ marginTop: 0, textAlign: 'center' }}>
              {word.clue}
            </span>
          </div>

          <form className="row" onSubmit={check} style={{ marginTop: '0.8rem' }}>
            <input
              aria-label="Type the word"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="spell it…"
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              disabled={verdict !== null}
            />
            <button className="btn btn-sm" type="submit" disabled={verdict !== null || !input.trim()}>
              Check
            </button>
          </form>

          <div className="row" style={{ marginTop: '0.7rem', justifyContent: 'center' }}>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => speakWord(word.word)}>
              ♪ Hear it
            </button>
          </div>

          {verdict && (
            <div className="row-between" style={{ marginTop: '0.7rem' }}>
              <VerdictChip verdict={verdict} />
              <button className="btn btn-ghost btn-sm" type="button" onClick={next}>
                {index + 1 >= total ? 'Finish round →' : 'Next word →'}
              </button>
            </div>
          )}
          <ErrorNote error={log.error} />
        </Card>
      )}
    </div>
  )
}
