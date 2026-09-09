import { useCallback, useEffect, useRef, useState } from 'react'

export type ListenState = 'unsupported' | 'idle' | 'listening' | 'done' | 'denied'

interface UseSpeechRecognition {
  state: ListenState
  /** Everything the engine offered, best guess first. Empty until `done`. */
  alternatives: string[]
  error: string | null
  /** Must be called from a user gesture — the mic prompt depends on it. */
  start: () => void
  stop: () => void
  reset: () => void
}

/** Resolved once: `webkit`-prefixed everywhere that has it, absent in Firefox. */
function speechRecognitionCtor() {
  if (typeof window === 'undefined') return undefined
  return window.SpeechRecognition ?? window.webkitSpeechRecognition
}

/**
 * One word in, a list of candidate transcriptions out. The mirror of
 * `useRecorder` — same state-union shape, same rule that the hardware is
 * released on unmount, same insistence that a denied permission produces a
 * message a student can act on rather than silence.
 *
 * Deliberately NOT biased toward the target word. The API has no grammar hook
 * in Chrome, but even the tricks that exist (feeding the word as a hint, or
 * accepting the closest match) would make the recogniser snap to the word we
 * are testing and report success for a mispronunciation. An unbiased engine
 * mishearing "veggie table" is the entire signal this feature runs on.
 */
export function useSpeechRecognition(lang = 'en-IN'): UseSpeechRecognition {
  const supported = speechRecognitionCtor() !== undefined
  const [state, setState] = useState<ListenState>(supported ? 'idle' : 'unsupported')
  const [alternatives, setAlternatives] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  /** Set when we stop on purpose, so `onend` knows not to report "heard nothing". */
  const gotResultRef = useRef(false)

  const release = useCallback(() => {
    const rec = recognitionRef.current
    if (!rec) return
    rec.onresult = null
    rec.onerror = null
    rec.onend = null
    try {
      rec.abort()
    } catch {
      // Already stopped. Nothing to do — abort() throws if it was never started.
    }
    recognitionRef.current = null
  }, [])

  const start = useCallback(() => {
    const Ctor = speechRecognitionCtor()
    if (!Ctor) {
      setState('unsupported')
      return
    }

    release()
    setAlternatives([])
    setError(null)
    gotResultRef.current = false

    const rec = new Ctor()
    rec.lang = lang
    rec.continuous = false
    // Interim results for a single word are noise: the engine revises them
    // constantly and the first guess is usually the target word regardless.
    rec.interimResults = false
    rec.maxAlternatives = 5

    rec.onresult = (event) => {
      const result = event.results[0]
      if (!result) return
      const heard: string[] = []
      for (let i = 0; i < result.length; i++) {
        const alt = result[i]
        if (alt?.transcript) heard.push(alt.transcript)
      }
      gotResultRef.current = true
      setAlternatives(heard)
      setState('done')
    }

    rec.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setState('denied')
        setError('Microphone access was blocked. Allow it in your browser, then try again.')
        return
      }
      if (event.error === 'no-speech') {
        // Not a failure — the student was quiet or too far from the mic.
        gotResultRef.current = true
        setAlternatives([])
        setState('done')
        return
      }
      if (event.error === 'aborted') return // Our own stop()/unmount.
      setState('done')
      setError(
        event.error === 'network'
          ? 'Speech recognition needs a connection — it runs on Google servers, not on your phone.'
          : 'Could not listen just now. Check no other app is using the mic, then try again.',
      )
    }

    rec.onend = () => {
      // Fires even when nothing was recognised, which is how "heard nothing"
      // gets reported at all — no-speech does not always raise onerror.
      if (!gotResultRef.current) {
        setAlternatives([])
        setState((s) => (s === 'listening' ? 'done' : s))
      }
    }

    try {
      rec.start()
      recognitionRef.current = rec
      setState('listening')
    } catch {
      setState('idle')
      setError('Already listening — give it a moment.')
    }
  }, [lang, release])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const reset = useCallback(() => {
    release()
    setAlternatives([])
    setError(null)
    setState(speechRecognitionCtor() ? 'idle' : 'unsupported')
  }, [release])

  // Same discipline as useRecorder: leave no mic running behind us. A recogniser
  // left alive keeps the tab's mic indicator lit long after the page is gone.
  useEffect(() => release, [release])

  return { state, alternatives, error, start, stop, reset }
}

/**
 * Speak a word using the free built-in voices. Prefers an Indian English voice
 * so the model the student hears matches the accent they are working in, then
 * any English voice, then whatever the device has.
 *
 * `speechSynthesis` is in lib.dom already, so this needs no declarations, and
 * it costs nothing — no API key, no network.
 */
export function speakWord(word: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(word)
  // Set the language even when no voice object matches: Chrome's voice list is
  // asynchronous and is frequently still empty on the first tap, and `lang`
  // alone is enough for the engine to pick an Indian English voice if it has one.
  utterance.lang = 'en-IN'

  const voices = window.speechSynthesis.getVoices()
  const voice =
    voices.find((v) => v.lang.replace('_', '-').toLowerCase().startsWith('en-in')) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('en'))
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang
  }

  // A shade under normal speed: the point is to hear the syllables, not the
  // fluency. Anything slower than this starts to distort the vowels.
  utterance.rate = 0.85
  window.speechSynthesis.speak(utterance)
}
