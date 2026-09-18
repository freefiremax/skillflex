import { useRef, useState } from 'react'
import { QUIZ_QUESTIONS } from '@skillflex/shared'
import { Card, ErrorNote } from '../../components/ui'
import { GameHeader, RoundDone, RoundHeader, react, useLogBattle } from './GameBits'

/**
 * Soft-skills quiz — the one game that isn't about English.
 *
 * Questions are about what to do in an interview or a group discussion, judged
 * by option index against a fixed key. Every option is plausible; the "why" line
 * is the point of the round.
 */
export default function QuizGamePage() {
  const log = useLogBattle('quiz')
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [lastVoice, setLastVoice] = useState('')
  const [finished, setFinished] = useState(false)

  const startRef = useRef(Date.now())

  const questions = QUIZ_QUESTIONS
  const total = questions.length
  const q = questions[index]!

  const choose = (optIndex: number) => {
    if (chosen !== null) return
    const ok = optIndex === q.answerIndex
    setChosen(optIndex)
    if (ok) setScore((s) => s + 1)
    setLastVoice(react(ok ? 'correct' : 'wrong', lastVoice))
  }

  const next = () => {
    if (index + 1 >= total) {
      const duration = Math.round((Date.now() - startRef.current) / 1000)
      setFinished(true)
      log.mutate({ mode: 'quiz', score, total, durationSeconds: duration })
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
        title="Soft Skills Quiz"
        blurb="Interview & group-discussion situations. Every option sounds reasonable — one works better than the rest."
      />

      {finished ? (
        <RoundDone score={score} total={total} onRestart={restart}>
          These are the soft skills interviews and group discussions actually test.
        </RoundDone>
      ) : (
        <div className="game-glass-deck">
          <RoundHeader mode="Soft Skills" index={index} total={total} />

          <div className="game-clue-plate" style={{ textAlign: 'left', padding: '24px' }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: '12px',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: '#b45309',
                letterSpacing: '0.06em',
                marginBottom: '8px',
              }}
            >
              💡 Real Scenario
            </span>
            <div style={{ fontSize: '18px', fontWeight: 750, color: '#1e1433', lineHeight: 1.5 }}>
              {q.prompt}
            </div>
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            {q.options.map((opt, i) => {
              const isAnswer = i === q.answerIndex
              const chosenThis = chosen === i
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
                  onClick={() => choose(i)}
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
                        background: 'rgba(245, 158, 11, 0.12)',
                        color: isAnswer && chosen !== null ? '#047857' : chosenThis ? '#b91c1c' : '#b45309',
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
                {chosen === q.answerIndex ? (
                  <span>
                    <strong style={{ color: '#047857' }}>Great choice! </strong>
                    {q.why}
                  </span>
                ) : (
                  <span>
                    <strong style={{ color: '#b91c1c' }}>Better approach: </strong>
                    “{q.options[q.answerIndex]}”. {q.why}
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
