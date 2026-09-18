import { useMemo, useRef, useState } from 'react'
import { SENTENCE_QUESTIONS } from '@skillflex/shared'
import { Card, ErrorNote } from '../../components/ui'
import { GameHeader, RoundDone, RoundHeader, react, useLogBattle } from './GameBits'

/**
 * Sentence Quiz — pick the word the whole sentence needs.
 *
 * Options are an answer plus hand-written distractors, shuffled per question.
 * Judged by index against a fixed key, so it records a count and never an
 * assessment.
 */
export default function SentenceGamePage() {
  const log = useLogBattle('sentence')
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [chosen, setChosen] = useState<string | null>(null)
  const [lastVoice, setLastVoice] = useState('')
  const [finished, setFinished] = useState(false)

  const startRef = useRef(Date.now())

  const questions = SENTENCE_QUESTIONS
  const total = questions.length
  const q = questions[index]!

  const options = useMemo(() => {
    return [q.answer, ...q.distractors].sort(() => Math.random() - 0.5)
  }, [q])

  const choose = (opt: string) => {
    if (chosen !== null) return
    const ok = opt === q.answer
    setChosen(opt)
    if (ok) setScore((s) => s + 1)
    setLastVoice(react(ok ? 'correct' : 'wrong', lastVoice))
  }

  const next = () => {
    if (index + 1 >= total) {
      const duration = Math.round((Date.now() - startRef.current) / 1000)
      setFinished(true)
      log.mutate({ mode: 'sentence', score, total, durationSeconds: duration })
      setLastVoice(react('round'))
    } else {
      setIndex((i) => i + 1)
      setChosen(null)
    }
  }

  const restart = () => {
    setIndex(0)
    setScore(0)
    setChosen(null)
    setFinished(false)
    startRef.current = Date.now()
  }

  return (
    <div className="funtime-container">
      <GameHeader
        title="Sentence Quiz"
        blurb="One word is missing. More than one option fits the gap — only one fits the full sentence."
      />

      {finished ? (
        <RoundDone score={score} total={total} onRestart={restart}>
          Sentences are about choosing the word the whole sentence needs, not just a word that fits.
        </RoundDone>
      ) : (
        <div className="game-glass-deck">
          <RoundHeader mode="Sentences" index={index} total={total} />

          <div className="game-clue-plate" style={{ textAlign: 'left', padding: '24px' }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: '12px',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: '#047857',
                letterSpacing: '0.06em',
                marginBottom: '8px',
              }}
            >
              ✍️ Complete the Sentence
            </span>
            <div style={{ fontSize: '19px', fontWeight: 750, color: '#1e1433', lineHeight: 1.5 }}>
              {q.sentence}
            </div>
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            {options.map((opt, i) => {
              const isAnswer = opt === q.answer
              const chosenThis = chosen === opt
              let stateClass = ''
              if (chosen !== null) {
                if (isAnswer) stateClass = 'opt-correct'
                else if (chosenThis) stateClass = 'opt-wrong'
              }
              const letter = String.fromCharCode(65 + i)
              return (
                <button
                  key={opt}
                  type="button"
                  className={`game-option-btn ${stateClass}`}
                  onClick={() => choose(opt)}
                  disabled={chosen !== null}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '13px',
                        fontWeight: 800,
                        background: 'rgba(112, 68, 214, 0.08)',
                        color: isAnswer && chosen !== null ? '#047857' : chosenThis ? '#b91c1c' : '#6b21a8',
                      }}
                    >
                      {letter}
                    </span>
                    <span>{opt}</span>
                  </div>
                  {chosen !== null && (
                    <span style={{ fontWeight: 800, fontSize: '16px' }}>
                      {isAnswer ? '✓' : chosenThis ? '✕' : ''}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {chosen !== null && (
            <div className="game-why-box">
              <div style={{ fontSize: '14px', lineHeight: 1.45, color: '#334155', flex: 1 }}>
                {chosen === q.answer ? (
                  <span>
                    <strong style={{ color: '#047857' }}>Spot on! </strong>
                    {q.why}
                  </span>
                ) : (
                  <span>
                    <strong style={{ color: '#b91c1c' }}>Not quite. </strong>
                    The answer is “{q.answer}”. {q.why}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={next}
                style={{
                  padding: '11px 22px',
                  borderRadius: '14px',
                  fontWeight: 800,
                  fontSize: '14px',
                  color: '#fff',
                  background: 'linear-gradient(135deg, #8e65f3, #683cd4)',
                  border: 'none',
                  boxShadow: '0 4px 14px rgba(104, 60, 212, 0.25)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {index + 1 >= total ? 'Finish round →' : 'Next →'}
              </button>
            </div>
          )}
          <ErrorNote error={log.error} />
        </div>
      )}
    </div>
  )
}
