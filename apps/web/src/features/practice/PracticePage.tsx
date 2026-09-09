import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  PRACTICE_GROUPS,
  PRACTICE_GROUP_LABELS,
  PRACTICE_WORDS,
  judgePronunciation,
  splitSyllables,
  type PracticeError,
  type PracticeGroup,
  type PronunciationVerdict,
} from '@skillflex/shared'
import { api } from '../../lib/api'
import { speakWord, useSpeechRecognition } from '../../lib/useSpeechRecognition'
import { Alert, Card, ErrorNote, Pill } from '../../components/ui'

interface Summary {
  summary: {
    wordsCleared: number
    attemptsThisWeek: number
    streakDays: number
    note: string
  }
}

/**
 * Whatever is currently being practised. A bank word and a word the student
 * typed differ only in how much we know about them, so they share one shape and
 * the page never branches on which kind it has — except to say so in the UI,
 * because a typed word has no hand-written diagnosis behind it and the student
 * should know that.
 */
interface Target {
  key: string
  word: string
  spellingSyllables: string[]
  commonErrors: PracticeError[]
  /** Absent for a typed word — this is what the API stores as `wordId`. */
  wordId?: string
  respelling?: string
  ipa?: string
  hint?: string
  group?: PracticeGroup
}

function fromBank(id: string): Target {
  const w = PRACTICE_WORDS.find((x) => x.id === id) ?? PRACTICE_WORDS[0]!
  return {
    key: w.id,
    wordId: w.id,
    word: w.word,
    spellingSyllables: w.spellingSyllables,
    commonErrors: w.commonErrors,
    respelling: w.respelling,
    ipa: w.ipa,
    hint: w.hint,
    group: w.group,
  }
}

function fromTypedWord(raw: string): Target {
  const word = raw.trim()
  return {
    key: `typed:${word.toLowerCase()}`,
    word,
    spellingSyllables: splitSyllables(word),
    commonErrors: [],
  }
}

function pickRandom(pool: string[], avoid: string | undefined): string {
  const options = pool.length > 1 && avoid ? pool.filter((id) => id !== avoid) : pool
  return options[Math.floor(Math.random() * options.length)] ?? pool[0]!
}

export default function PracticePage() {
  const queryClient = useQueryClient()
  const listen = useSpeechRecognition('en-IN')

  const [group, setGroup] = useState<PracticeGroup | 'all'>('all')
  const [target, setTarget] = useState<Target>(() => fromBank(pickRandom(PRACTICE_WORDS.map((w) => w.id), undefined)))
  const [verdict, setVerdict] = useState<PronunciationVerdict | null>(null)
  const [typed, setTyped] = useState('')

  const pool = useMemo(
    () => PRACTICE_WORDS.filter((w) => group === 'all' || w.group === group).map((w) => w.id),
    [group],
  )

  const summary = useQuery({
    queryKey: ['practice-summary'],
    queryFn: () => api.get<Summary>('/practice/summary'),
  })

  const log = useMutation({
    mutationFn: (body: { wordId?: string; word: string; heard?: string; matched: boolean }) =>
      api.post('/practice/attempts', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['practice-summary'] }),
  })

  /**
   * One judgement per listening session, hence the ref: `alternatives` and
   * `state` land in separate renders, so a plain dependency check would judge
   * twice and log the attempt twice with it.
   */
  const judgedRef = useRef(false)

  useEffect(() => {
    if (listen.state !== 'done' || judgedRef.current) return
    judgedRef.current = true

    const result = judgePronunciation(target, listen.alternatives)
    setVerdict(result)

    // Silence is not an attempt. Logging it would inflate the streak with days
    // the student opened the page and said nothing.
    if (result.kind === 'no_speech') return
    log.mutate({
      ...(target.wordId ? { wordId: target.wordId } : {}),
      word: target.word,
      ...('heard' in result && result.heard ? { heard: result.heard } : {}),
      matched: result.kind === 'clear',
    })
    // `log` is a stable mutation object from react-query; including it would
    // re-run this on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listen.state, listen.alternatives, target])

  const beginListening = useCallback(() => {
    judgedRef.current = false
    setVerdict(null)
    listen.start()
  }, [listen])

  const moveTo = useCallback(
    (next: Target) => {
      judgedRef.current = false
      setVerdict(null)
      listen.reset()
      setTarget(next)
    },
    [listen],
  )

  const nextWord = useCallback(() => {
    moveTo(fromBank(pickRandom(pool, target.wordId)))
  }, [moveTo, pool, target.wordId])

  const stats = summary.data?.summary

  return (
    <div className="stack">
      <div>
        <h1>Practise a word</h1>
        <p className="small">
          Read the word out loud. If something slips, this shows you which syllable — so you know
          what to fix, not just that you got it wrong.
        </p>
      </div>

      {/* The honesty banner, same treatment as the plan page's provenance note.
          A machine listening to a student is the one place the product's "no AI
          assessment" promise needs restating rather than assuming. */}
      <div className="ai-note">
        <div className="tiny strong" style={{ color: 'var(--accent)', marginBottom: '0.2rem' }}>
          THIS IS A DRILL, NOT A TEST
        </div>
        <div className="tiny dim">
          Nothing here is scored, and nothing here reaches your mentor, your plan or your college.
          {stats ? ` ${stats.note}` : ''} Only a human mentor ever assesses your work.
        </div>
      </div>

      {stats && (
        <div className="practice-stats">
          <div className="practice-stat">
            <b className="mono">{stats.wordsCleared}</b>
            <span className="tiny faint">words clear</span>
          </div>
          <div className="practice-stat">
            <b className="mono">{stats.attemptsThisWeek}</b>
            <span className="tiny faint">tries this week</span>
          </div>
          <div className="practice-stat">
            <b className="mono">{stats.streakDays}</b>
            <span className="tiny faint">day streak</span>
          </div>
        </div>
      )}

      {listen.state === 'unsupported' ? (
        <Alert tone="warn">
          <strong>This browser can’t listen.</strong> Speech recognition only exists in Chrome, Edge,
          Safari and Samsung Internet — Firefox has never shipped it. Open this page in Chrome to
          practise. Everything else in SkillFlex works here as normal.
        </Alert>
      ) : null}

      {/* --- The word ------------------------------------------------------ */}
      <Card>
        <div className="row-between" style={{ marginBottom: '0.6rem' }}>
          <span className="tiny faint">
            {target.group ? PRACTICE_GROUP_LABELS[target.group].toUpperCase() : 'YOUR OWN WORD'}
          </span>
          <button className="btn btn-ghost btn-sm" type="button" onClick={nextWord}>
            Next word →
          </button>
        </div>

        <div className="word-plate">
          {target.spellingSyllables.map((syl, i) => (
            <span
              key={`${target.key}-${i}`}
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

        {target.respelling && (
          <div className="center" style={{ marginTop: '0.6rem' }}>
            <div className="small strong" style={{ color: 'var(--brand-deep)' }}>
              {target.respelling}
            </div>
            {target.ipa && <div className="tiny faint mono">{target.ipa}</div>}
          </div>
        )}

        <div className="word-say">
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => speakWord(target.word)}>
            ♪ Hear it
          </button>
        </div>

        {target.hint && (
          <div className="hint center" style={{ marginTop: '0.6rem' }}>
            {target.hint}
          </div>
        )}
      </Card>

      {/* --- The mic ------------------------------------------------------- */}
      {listen.state !== 'unsupported' && (
        <button
          className={`btn btn-block mic-btn ${listen.state === 'listening' ? 'btn-ghost' : 'btn-primary'}`}
          type="button"
          onClick={listen.state === 'listening' ? listen.stop : beginListening}
        >
          {listen.state === 'listening' ? (
            <>
              <span className="rec-dot" /> Listening — say “{target.word}”
            </>
          ) : verdict ? (
            'Try again'
          ) : (
            'Tap and say the word'
          )}
        </button>
      )}

      {listen.state === 'denied' && (
        <Alert tone="error">
          {listen.error ?? 'Microphone access was blocked.'} On Android Chrome: tap the lock icon in
          the address bar → Permissions → Microphone → Allow.
        </Alert>
      )}
      {listen.state !== 'denied' && listen.error && <Alert tone="warn">{listen.error}</Alert>}

      {/* --- The verdict --------------------------------------------------- */}
      {verdict && <VerdictPanel verdict={verdict} target={target} onNext={nextWord} />}

      <ErrorNote error={log.error} />

      {/* --- Any other word ----------------------------------------------- */}
      <Card className="card-tight">
        <div className="tiny faint" style={{ marginBottom: '0.4rem' }}>
          PRACTISE ANY OTHER WORD
        </div>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            if (typed.trim().length < 2) return
            moveTo(fromTypedWord(typed))
            setTyped('')
          }}
        >
          <input
            aria-label="Any word you want to practise"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="e.g. entrepreneur"
            maxLength={40}
          />
          <button className="btn btn-sm" type="submit" disabled={typed.trim().length < 2}>
            Use it
          </button>
        </form>
        <div className="hint">
          Your own words work, but the advice is coarser: the {PRACTICE_WORDS.length} words above
          carry a hand-written fix for the mistake people actually make, and a typed word only gets
          the syllable we think slipped.
        </div>
      </Card>

      {/* --- Word groups --------------------------------------------------- */}
      <div>
        <div className="tiny faint" style={{ marginBottom: '0.4rem' }}>
          PICK A KIND OF WORD
        </div>
        <div className="row wrap">
          <button
            className={`btn btn-sm ${group === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            type="button"
            onClick={() => setGroup('all')}
          >
            Everything
          </button>
          {PRACTICE_GROUPS.map((g) => (
            <button
              key={g}
              className={`btn btn-sm ${group === g ? 'btn-primary' : 'btn-ghost'}`}
              type="button"
              onClick={() => {
                setGroup(g)
                moveTo(fromBank(pickRandom(PRACTICE_WORDS.filter((w) => w.group === g).map((w) => w.id), undefined)))
              }}
            >
              {PRACTICE_GROUP_LABELS[g]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * The result. Every branch has to be honest about what the engine can actually
 * tell: a pass says "nothing detectably wrong", never "perfect", because the
 * recogniser transcribes a slightly-off word correctly more often than not.
 */
function VerdictPanel({
  verdict,
  target,
  onNext,
}: {
  verdict: PronunciationVerdict
  target: Target
  onNext: () => void
}) {
  if (verdict.kind === 'no_speech') {
    return (
      <Alert tone="info">
        Didn’t catch anything. Hold the phone closer and say the word once, at normal volume.
      </Alert>
    )
  }

  if (verdict.kind === 'clear') {
    return (
      <Card>
        <div className="row-between" style={{ marginBottom: '0.4rem' }}>
          <Pill tone="ok">No error detected</Pill>
          <button className="btn btn-ghost btn-sm" type="button" onClick={onNext}>
            Next word →
          </button>
        </div>
        <div className="small">
          “{target.word}” came back clean. Worth knowing what that does and doesn’t mean: this
          checks that the word was recognisable, not that every sound was perfect. Fine detail needs
          a human ear — which is what your mentor is for.
        </div>
      </Card>
    )
  }

  if (verdict.kind === 'different_word') {
    return (
      <Alert tone="warn">
        That came back as “{verdict.heard}”, which is a different word rather than a slip on this
        one. Have another go at “{target.word}”.
      </Alert>
    )
  }

  const syllable = target.spellingSyllables[verdict.syllableIndex] ?? target.word

  return (
    <Card>
      <div className="row-between" style={{ marginBottom: '0.5rem' }}>
        <Pill tone="warn">Something slipped</Pill>
        <button className="btn btn-ghost btn-sm" type="button" onClick={onNext}>
          Next word →
        </button>
      </div>

      <div className="small" style={{ marginBottom: '0.5rem' }}>
        It came out closer to “{verdict.heard}”. The part to work on is{' '}
        <span className="strong" style={{ color: 'var(--danger)' }}>
          {syllable}
        </span>
        {target.spellingSyllables.length > 1 ? ' — highlighted in the word above.' : '.'}
      </div>

      {verdict.kind === 'known_error' ? (
        <div className="ai-note">
          <div className="tiny strong" style={{ color: 'var(--accent)', marginBottom: '0.2rem' }}>
            HOW TO FIX IT
          </div>
          <div className="tiny dim">{verdict.note}</div>
        </div>
      ) : (
        <div className="hint" style={{ marginTop: 0 }}>
          {target.respelling
            ? `Use the respelling above as your model: ${target.respelling}. Tap "Hear it", then say it back one syllable at a time.`
            : 'Tap "Hear it", then say it back one syllable at a time. This word has no hand-written note, so the guess above is approximate.'}
        </div>
      )}
    </Card>
  )
}
