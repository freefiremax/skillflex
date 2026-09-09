import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CHEER_VOICES,
  ENCOURAGE_VOICES,
  QUIZ_QUESTIONS,
  ROUND_WRAPPERS,
  SENTENCE_QUESTIONS,
  SPELLING_WORDS,
  pickVoice,
} from '@skillflex/shared'
import { PRACTICE_WORDS, judgePronunciation, type PronunciationVerdict } from '@skillflex/shared'
import { api } from '../../lib/api'
import { speak, speakWord, useSpeechRecognition } from '../../lib/useSpeechRecognition'
import { Alert, Card, ErrorNote, Pill } from '../../components/ui'

type BattleMode = 'spelling' | 'pronunciation' | 'sentence' | 'quiz'

const BATTLE_MODES: { id: BattleMode; label: string; icon: string }[] = [
  { id: 'spelling', label: 'Spelling', icon: '✏' },
  { id: 'pronunciation', label: 'Say it', icon: '♪' },
  { id: 'sentence', label: 'Sentences', icon: '§' },
  { id: 'quiz', label: 'Soft skills', icon: '? ' },
]

interface BattleAttempt {
  mode: 'spelling' | 'sentence' | 'quiz'
  score: number
  total: number
  durationSeconds: number
}

interface Summary {
  summary: { rounds: number; wins: number; best: number; byMode: Record<string, number>; note: string }
}

type Verdict = 'correct' | 'wrong'

/**
 * The gamified drill. Four games, all judged against fixed answers — the
 * spelling is a string compare, sentences and quiz are option indexes, and
 * pronunciation reuses the drill's own client-side judge. Nothing a machine
 * judges grades anyone; a round records a count (score/total), which is the
 * same objective fact as the practice module's `matched`.
 */
export default function BattlePage() {
  const [mode, setMode] = useState<BattleMode>('spelling')
  const [key, setKey] = useState(0)

  // Re-mount the game on mode change, so each mode starts a fresh round.
  const activeMode = useMemo(() => mode, [mode])

  return (
    <div className="stack">
      <div>
        <h1>Battles</h1>
        <p className="small">
          Quick drills that talk back. Right answers get a cheer; the games judge against a fixed key
          — no AI scores you, and a win is just "everything right".
        </p>
      </div>

      <div className="row wrap">
        {BATTLE_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`btn btn-sm ${activeMode === m.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              setMode(m.id)
              setKey((k) => k + 1)
            }}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      <BattleSummaryStats />

      <div key={key}>
        {activeMode === 'spelling' && <SpellingGame />}
        {activeMode === 'pronunciation' && <PronunciationGame />}
        {activeMode === 'sentence' && <SentenceGame />}
        {activeMode === 'quiz' && <QuizGame />}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

/** Speak a cheer or an "aww" out loud. The voice is the device's own — free,
 *  offline, and the same trick the drill uses to say the word. */
function react(kind: 'correct' | 'wrong' | 'round', avoid?: string) {
  const pool =
    kind === 'correct' ? CHEER_VOICES : kind === 'wrong' ? ENCOURAGE_VOICES : ROUND_WRAPPERS
  const text = pickVoice(pool, avoid)
  speak(text)
  return text
}

function RoundHeader({ mode, index, total }: { mode: string; index: number; total: number }) {
  return (
    <div className="row-between" style={{ marginBottom: '0.6rem' }}>
      <span className="tiny faint">{mode.toUpperCase()} · ROUND {index + 1} OF {total}</span>
      <span className="tiny faint mono">{(index / total) * 100}%</span>
    </div>
  )
}

function VerdictChip({ verdict }: { verdict: Verdict }) {
  return (
    <Pill tone={verdict === 'correct' ? 'ok' : 'warn'}>{verdict === 'correct' ? 'Right!' : 'Not quite'}</Pill>
  )
}

function useLogBattle(mode: 'spelling' | 'sentence' | 'quiz') {
  const queryClient = useQueryClient()
  const log = useMutation({
    mutationFn: (body: BattleAttempt) => api.post('/battles/attempts', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['battle-summary'] }),
  })
  return log
}

function BattleSummaryStats() {
  const summary = useQuery({
    queryKey: ['battle-summary'],
    queryFn: () => api.get<Summary>('/battles/summary'),
  })
  const s = summary.data?.summary
  if (!s) return null
  return (
    <div className="practice-stats">
      <div className="practice-stat">
        <b className="mono">{s.rounds}</b>
        <span className="tiny faint">rounds played</span>
      </div>
      <div className="practice-stat">
        <b className="mono">{s.wins}</b>
        <span className="tiny faint">perfect rounds</span>
      </div>
      <div className="practice-stat">
        <b className="mono">{s.best}</b>
        <span className="tiny faint">best score</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Spelling
// ---------------------------------------------------------------------------

function SpellingGame() {
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
      const finalScore = score
      setFinished(true)
      log.mutate({ mode: 'spelling', score: finalScore, total, durationSeconds: duration })
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

  if (finished) {
    return (
      <Card>
        <div className="row-between" style={{ marginBottom: '0.4rem' }}>
          <div className="strong">Round done — {score}/{total}</div>
          {score === total && <Pill tone="ok">Perfect</Pill>}
        </div>
        <div className="small" style={{ marginBottom: '0.6rem' }}>
          {score === total
            ? 'Every word right. That’s a perfect round.'
            : 'Every one of those was against a fixed spelling. Try the next round.'}
        </div>
        <button className="btn btn-block" type="button" onClick={restart}>
          Play again
        </button>
      </Card>
    )
  }

  return (
    <Card>
      <RoundHeader mode="Spelling" index={index} total={total} />

      <div className="word-plate" style={{ fontSize: '1.1rem', minHeight: 0, padding: '0.9rem 0.75rem' }}>
        <span className="hint" style={{ marginTop: 0, textAlign: 'center' }}>{word.clue}</span>
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
  )
}

// ---------------------------------------------------------------------------
// Sentence
// ---------------------------------------------------------------------------

function SentenceGame() {
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
    const isLast = index + 1 >= total
    if (isLast) {
      const duration = Math.round((Date.now() - startRef.current) / 1000)
      const finalScore = score
      setFinished(true)
      log.mutate({ mode: 'sentence', score: finalScore, total, durationSeconds: duration })
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

  if (finished) {
    return (
      <Card>
        <div className="row-between" style={{ marginBottom: '0.4rem' }}>
          <div className="strong">Round done — {score}/{total}</div>
          <Pill tone={score === total ? 'ok' : 'default'}>{score === total ? 'Perfect' : 'Nice go'}</Pill>
        </div>
        <div className="small" style={{ marginBottom: '0.6rem' }}>
          Sentences are about choosing the word the whole sentence needs, not just a word that fits.
        </div>
        <button className="btn btn-block" type="button" onClick={restart}>
          Play again
        </button>
      </Card>
    )
  }

  return (
    <Card>
      <RoundHeader mode="Sentences" index={index} total={total} />

      <div className="small strong" style={{ marginBottom: '0.7rem' }}>{q.sentence}</div>

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
            <button key={opt} type="button" className={cls} onClick={() => choose(opt)} disabled={chosen !== null}>
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
  )
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

function QuizGame() {
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
    const isLast = index + 1 >= total
    if (isLast) {
      const duration = Math.round((Date.now() - startRef.current) / 1000)
      const finalScore = score
      setFinished(true)
      log.mutate({ mode: 'quiz', score: finalScore, total, durationSeconds: duration })
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

  if (finished) {
    return (
      <Card>
        <div className="row-between" style={{ marginBottom: '0.4rem' }}>
          <div className="strong">Round done — {score}/{total}</div>
          <Pill tone={score === total ? 'ok' : 'default'}>{score === total ? 'Perfect' : 'Nice go'}</Pill>
        </div>
        <div className="small" style={{ marginBottom: '0.6rem' }}>
          These are the soft skills interviews and group discussions actually test.
        </div>
        <button className="btn btn-block" type="button" onClick={restart}>
          Play again
        </button>
      </Card>
    )
  }

  return (
    <Card>
      <RoundHeader mode="Soft skills" index={index} total={total} />

      <div className="small strong" style={{ marginBottom: '0.7rem' }}>{q.prompt}</div>

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
            <button key={opt} type="button" className={cls} onClick={() => choose(i)} disabled={chosen !== null}>
              {opt}
            </button>
          )
        })}
      </div>

      {chosen !== null && (
        <div className="row-between" style={{ marginTop: '0.7rem' }}>
          <div className="tiny faint" style={{ maxWidth: '70%' }}>
            {chosen === q.answerIndex ? q.why : `The better pick is “${q.options[q.answerIndex]}”. ${q.why}`}
          </div>
          <button className="btn btn-ghost btn-sm" type="button" onClick={next}>
            {index + 1 >= total ? 'Finish round →' : 'Next →'}
          </button>
        </div>
      )}
      <ErrorNote error={log.error} />
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Pronunciation
// ---------------------------------------------------------------------------

function PronunciationGame() {
  const queryClient = useQueryClient()
  const listen = useSpeechRecognition('en-IN')
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [verdict, setVerdict] = useState<PronunciationVerdict | null>(null)
  const [lastVoice, setLastVoice] = useState('')
  const [finished, setFinished] = useState(false)

  const startRef = useRef(Date.now())
  const judgedRef = useRef(false)

  // A round of the drill's own words — the ones that carry a hand-written fix.
  const words = useMemo(
    () => [...PRACTICE_WORDS].sort(() => Math.random() - 0.5).slice(0, 5),
    [],
  )
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

    const result = judgePronunciation({ word: word.word, spellingSyllables: word.spellingSyllables, commonErrors: word.commonErrors }, listen.alternatives)
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
      const duration = Math.round((Date.now() - startRef.current) / 1000)
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
    startRef.current = Date.now()
  }

  if (finished) {
    return (
      <Card>
        <div className="row-between" style={{ marginBottom: '0.4rem' }}>
          <div className="strong">Round done — {score}/{total}</div>
          <Pill tone={score === total ? 'ok' : 'default'}>{score === total ? 'Perfect' : 'Nice go'}</Pill>
        </div>
        <div className="small" style={{ marginBottom: '0.6rem' }}>
          Every off-syllable was highlighted as you said it. The verdicts are "recognisable or not" —
          a human ear is still what grades real work.
        </div>
        <button className="btn btn-block" type="button" onClick={restart}>
          Play again
        </button>
      </Card>
    )
  }

  return (
    <Card>
      <RoundHeader mode="Say it" index={index} total={total} />

      <div className="word-plate">
        {word.spellingSyllables.map((syl, i) => (
          <span
            key={`${word.id}-${i}`}
            className={verdict && 'syllableIndex' in verdict && verdict.syllableIndex === i ? 'syl syl-bad' : 'syl'}
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
        <Alert tone="warn">Speech recognition needs Chrome or Edge. Try the other battles here.</Alert>
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
          <button className="btn btn-ghost btn-sm" type="button" onClick={beginListening} style={{ marginTop: '0.5rem' }}>
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
  )
}
