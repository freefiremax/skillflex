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
    <div className="stack">
      <GameHeader
        title="Soft Skills Quiz"
        blurb="Interview and group-discussion situations. Every option sounds reasonable — one works better than the rest."
      />

      {finished ? (
        <RoundDone score={score} total={total} onRestart={restart}>
          These are the soft skills interviews and group discussions actually test.
        </RoundDone>
      ) : (
        <Card>
          <RoundHeader mode="Soft skills" index={index} total={total} />

          <div className="small strong" style={{ marginBottom: '0.7rem' }}>
            {q.prompt}
          </div>

          <div className="stack-sm">
            {q.options.map((opt, i) => {
              const isAnswer = i === q.answerIndex
              const chosenThis = chosen === i
              let cls = 'btn btn-block btn-ghost'
              if (chosen !== null) {
                if (isAnswer) cls = 'btn btn-block btn-primary'
                else if (chosenThis) cls = 'btn btn-block'
              }
              return (
                <button
                  key={opt}
                  type="button"
                  className={cls}
                  onClick={() => choose(i)}
                  disabled={chosen !== null}
                >
                  {opt}
                </button>
              )
            })}
          </div>

          {chosen !== null && (
            <div className="row-between" style={{ marginTop: '0.7rem' }}>
              <div className="tiny faint" style={{ maxWidth: '70%' }}>
                {chosen === q.answerIndex
                  ? q.why
                  : `The better pick is “${q.options[q.answerIndex]}”. ${q.why}`}
              </div>
              <button className="btn btn-ghost btn-sm" type="button" onClick={next}>
                {index + 1 >= total ? 'Finish round →' : 'Next →'}
              </button>
            </div>
          )}
          <ErrorNote error={log.error} />
        </Card>
      )}
    </div>
  )
}
