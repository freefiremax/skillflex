import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  PRACTICE_WORDS,
  judgePronunciation,
  type PronunciationVerdict,
} from '@skillflex/shared'
import { api } from '../../lib/api'
import { speakWord, useSpeechRecognition } from '../../lib/useSpeechRecognition'
import { Alert, Card, ErrorNote } from '../../components/ui'
import { GameHeader, RoundDone, RoundHeader, VerdictChip, react } from './GameBits'

/**
 * Pronunciation Check — say the word, see which syllable drifted.
 *
 * The recognition engine sits behind `useSpeechRecognition` (see
 * lib/useSpeechRecognition.ts): this page only reads the hook's state union
 * (`idle | listening | done | denied | unsupported`) and its `alternatives`
 * array, so swapping the browser's Web Speech API for a server-side recogniser
 * is a change to that one file and nothing here.
 *
 * The judging is `judgePronunciation` in packages/shared — a hand-written
 * comparison against the word's known mispronunciations, returning "clear" or
 * "which syllable slipped". Not a score, and no model opinion of the speaker.
 * `POST /practice/attempts` records `matched: boolean` and nothing else.
 */
export default function SpeakGamePage() {
  const queryClient = useQueryClient()
  const listen = useSpeechRecognition('en-IN')
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [verdict, setVerdict] = useState<PronunciationVerdict | null>(null)
  const [lastVoice, setLastVoice] = useState('')
  const [finished, setFinished] = useState(false)

  // No round timer here: unlike the other three, this game logs one row per word
  // to /practice/attempts as it goes, never a round with a duration.
  const judgedRef = useRef(false)

  // A round of the drill's own words — the ones that carry a hand-written fix.
  const words = useMemo(() => [...PRACTICE_WORDS].sort(() => Math.random() - 0.5).slice(0, 5), [])
  const total = words.length
  const word = words[index]!

  const log = useMutation({
    mutationFn: (body: { wordId?: string; word: string; heard?: string; matched: boolean }) =>
      api.post('/practice/attempts', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['practice-summary'] }),
  })

  useEffect(() => {
    if (listen.state !== 'done' || judgedRef.current) return
    judgedRef.current = true

    const result = judgePronunciation(
      {
        word: word.word,
        spellingSyllables: word.spellingSyllables,
        commonErrors: word.commonErrors,
      },
      listen.alternatives,
    )
    setVerdict(result)

    // Misheard-is-silence is not an attempt.
    if (result.kind === 'no_speech') return

    const cleared = result.kind === 'clear'
    if (cleared) setScore((s) => s + 1)
    setLastVoice(react(cleared ? 'correct' : 'wrong', lastVoice))

    log.mutate({
      wordId: word.id,
      word: word.word,
      ...('heard' in result && result.heard ? { heard: result.heard } : {}),
      matched: cleared,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listen.state, listen.alternatives, word])

  const beginListening = useCallback(() => {
    judgedRef.current = false
    setVerdict(null)
    listen.start()
  }, [listen])

  const next = useCallback(() => {
    if (index + 1 >= total) {
      setFinished(true)
      setLastVoice(react('round'))
      setVerdict(null)
    } else {
      setIndex((i) => i + 1)
      setVerdict(null)
      judgedRef.current = false
      listen.reset()
    }
  }, [index, total, listen])

  const restart = () => {
    setIndex(0)
    setScore(0)
    setFinished(false)
    setVerdict(null)
    judgedRef.current = false
    listen.reset()
  }

  return (
    <div className="stack">
      <GameHeader
        title="Pronunciation Check"
        blurb="Say the word out loud. You'll see which syllable slipped — “recognisable or not”, never a score."
      />

      {finished ? (
        <RoundDone score={score} total={total} onRestart={restart}>
          Every off-syllable was highlighted as you said it. The verdicts are “recognisable or not” —
          a human ear is still what grades real work.
        </RoundDone>
      ) : (
        <Card>
          <RoundHeader mode="Say it" index={index} total={total} />

          <div className="word-plate">
            {word.spellingSyllables.map((syl, i) => (
              <span
                key={`${word.id}-${i}`}
                className={
                  verdict && 'syllableIndex' in verdict && verdict.syllableIndex === i
                    ? 'syl syl-bad'
                    : 'syl'
                }
              >
                {syl}
              </span>
            ))}
          </div>
          <div className="word-say">
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => speakWord(word.word)}>
              ♪ Hear it
            </button>
          </div>

          {listen.state === 'unsupported' ? (
            <Alert tone="warn">
              Speech recognition needs Chrome or Edge. The other three games work anywhere.
            </Alert>
          ) : (
            <button
              className={`btn btn-block mic-btn ${listen.state === 'listening' ? 'btn-ghost' : 'btn-primary'}`}
              type="button"
              onClick={listen.state === 'listening' ? listen.stop : beginListening}
            >
              {listen.state === 'listening' ? (
                <>
                  <span className="rec-dot" /> Listening — say “{word.word}”
                </>
              ) : verdict ? (
                'Try again'
              ) : (
                'Tap and say the word'
              )}
            </button>
          )}

          {listen.state === 'denied' && (
            <Alert tone="error">{listen.error ?? 'Microphone access was blocked.'}</Alert>
          )}
          {listen.state !== 'denied' && listen.error && <Alert tone="warn">{listen.error}</Alert>}

          {verdict && verdict.kind === 'no_speech' && (
            <div style={{ marginTop: '0.7rem' }}>
              <Alert tone="info">Didn’t catch anything — hold the phone closer and say it once.</Alert>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={beginListening}
                style={{ marginTop: '0.5rem' }}
              >
                Listen again
              </button>
            </div>
          )}
          {verdict && verdict.kind !== 'no_speech' && (
            <div className="row-between" style={{ marginTop: '0.7rem' }}>
              <VerdictChip verdict={verdict.kind === 'clear' ? 'correct' : 'wrong'} />
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
