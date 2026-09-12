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
    <div className="stack">
      <GameHeader
        title="Sentence Quiz"
        blurb="One word is missing. More than one option fits the gap — only one fits the sentence."
      />

      {finished ? (
        <RoundDone score={score} total={total} onRestart={restart}>
          Sentences are about choosing the word the whole sentence needs, not just a word that fits.
        </RoundDone>
      ) : (
        <Card>
          <RoundHeader mode="Sentences" index={index} total={total} />

          <div className="small strong" style={{ marginBottom: '0.7rem' }}>
            {q.sentence}
          </div>

          <div className="stack-sm">
            {options.map((opt) => {
              const isAnswer = opt === q.answer
              const chosenThis = chosen === opt
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
                  onClick={() => choose(opt)}
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
                {chosen === q.answer ? q.why : `The answer is “${q.answer}”. ${q.why}`}
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
