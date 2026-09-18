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
    <div className="funtime-container">
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
        <div className="game-glass-deck">
          <RoundHeader mode="Pronunciation" index={index} total={total} />

          <div className="game-clue-plate" style={{ padding: '28px 20px' }}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'baseline',
                gap: '4px',
                fontSize: 'clamp(28px, 6vw, 42px)',
                fontWeight: 850,
                letterSpacing: '0.02em',
                color: '#1e1433',
                marginBottom: '14px',
              }}
            >
              {word.spellingSyllables.map((syl, i) => (
                <span
                  key={`${word.id}-${i}`}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '8px',
                    background:
                      verdict && 'syllableIndex' in verdict && verdict.syllableIndex === i
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'transparent',
                    color:
                      verdict && 'syllableIndex' in verdict && verdict.syllableIndex === i
                        ? '#dc2626'
                        : 'inherit',
                    textDecoration:
                      verdict && 'syllableIndex' in verdict && verdict.syllableIndex === i
                        ? 'underline wavy #dc2626'
                        : 'none',
                    textUnderlineOffset: '6px',
                  }}
                >
                  {syl}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
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
                  border: '1px solid rgba(14, 165, 233, 0.25)',
                  color: '#0369a1',
                  fontWeight: 750,
                  fontSize: '13px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                  cursor: 'pointer',
                }}
              >
                🔊 Hear correct pronunciation
              </button>
            </div>
          </div>

          {listen.state === 'unsupported' ? (
            <Alert tone="warn">
              Speech recognition needs Chrome or Edge. The other three games work anywhere.
            </Alert>
          ) : (
            <button
              type="button"
              onClick={listen.state === 'listening' ? listen.stop : beginListening}
              style={{
                width: '100%',
                padding: '18px 24px',
                borderRadius: '20px',
                fontWeight: 800,
                fontSize: '16px',
                color: listen.state === 'listening' ? 'var(--brand-deep)' : '#fff',
                background:
                  listen.state === 'listening'
                    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(243, 235, 254, 0.9))'
                    : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                border: listen.state === 'listening' ? '2px solid #7044d6' : '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow:
                  listen.state === 'listening'
                    ? '0 0 0 6px rgba(112, 68, 214, 0.2), 0 8px 24px rgba(112, 68, 214, 0.25)'
                    : '0 8px 24px rgba(2, 132, 199, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {listen.state === 'listening' ? (
                <>
                  <span className="rec-dot" /> Listening — Say “{word.word}” now
                </>
              ) : verdict ? (
                '🎙️ Tap to Try Again'
              ) : (
                '🎙️ Tap and Say the Word'
              )}
            </button>
          )}

          {listen.state === 'denied' && (
            <Alert tone="error">{listen.error ?? 'Microphone access was blocked.'}</Alert>
          )}
          {listen.state !== 'denied' && listen.error && <Alert tone="warn">{listen.error}</Alert>}

          {verdict && verdict.kind === 'no_speech' && (
            <div style={{ marginTop: '16px' }}>
              <Alert tone="info">Didn’t catch anything — hold the microphone closer and speak clearly.</Alert>
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
            <div className="game-why-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <VerdictChip verdict={verdict.kind === 'clear' ? 'correct' : 'wrong'} />
                <span style={{ fontSize: '14px', color: '#475569' }}>
                  {verdict.kind === 'clear'
                    ? 'Clean pronunciation!'
                    : 'A syllable drifted — check the red mark above.'}
                </span>
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
