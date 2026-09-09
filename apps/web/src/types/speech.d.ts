/**
 * Ambient declarations for the Web Speech API's recognition half.
 *
 * `SpeechSynthesis` (the "Hear it" button) ships in TypeScript's `lib.dom.d.ts`
 * and needs nothing. `SpeechRecognition` does not — it is still behind the
 * `webkit` prefix in every shipping browser and has never been added to the
 * standard lib, so without this file `new webkitSpeechRecognition()` does not
 * compile.
 *
 * Kept to exactly the surface useSpeechRecognition touches. Anything wider is
 * speculative: this is a de-facto standard, not a real one, and the parts we do
 * not use are the parts most likely to differ between browsers.
 */

interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}

interface SpeechRecognitionResult {
  readonly length: number
  readonly isFinal: boolean
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

/** `error` is a string union in the spec; 'not-allowed' is the denied case. */
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
  readonly message: string
}

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  /** More alternatives means a better chance of spotting a correct reading. */
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
  onend: ((this: SpeechRecognition, ev: Event) => void) | null
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null
  onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null
}

declare const SpeechRecognition: {
  prototype: SpeechRecognition
  new (): SpeechRecognition
}

interface Window {
  SpeechRecognition?: typeof SpeechRecognition
  webkitSpeechRecognition?: typeof SpeechRecognition
}
