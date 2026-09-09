/**
 * Reaction voices for the battle games.
 *
 * A spelling/quiz/sentence battle can't hear the student, so the fun has to
 * come from somewhere — this is where. Each verdict plays out loud via
 * `speechSynthesis` (the same free, offline voice the drill already uses), so a
 * correct answer answers back before the student even reads the panel.
 *
 * The phrases are deliberately a small, curated set rather than a generator.
 * Generic "correct!"/"wrong!" gets grating by the third round; a rotating set
 * with a handful of genuine exclamations keeps it short and likeable. Each
 * entry is { text, voice } — the text is what speaks, the parenthetical is a
 * one-line label shown on the verdict chip.
 */

export interface ReactionVoice {
  text: string
  label: string
}

/** For a correct answer. Pick one at random so reruns don't repeat. */
export const CHEER_VOICES: ReactionVoice[] = [
  { text: 'Yeahh! Gotcha!', label: 'Gotcha' },
  { text: 'Bravo!', label: 'Bravo' },
  { text: 'Boom! Nailed it!', label: 'Nailed it' },
  { text: 'You beauty!', label: 'You beauty' },
  { text: 'Smashing!', label: 'Smashing' },
  { text: 'That’s the one!', label: 'That’s the one' },
]

/** For a miss. Gentler than the cheers — this is a learning app, not a game show. */
export const ENCOURAGE_VOICES: ReactionVoice[] = [
  { text: 'Aww, noo!', label: 'Aww noo' },
  { text: 'So close!', label: 'So close' },
  { text: 'Not quite!', label: 'Not quite' },
  { text: 'Nice try—again!', label: 'Nice try' },
]

/** Round over, a fresh set to play. */
export const ROUND_WRAPPERS: ReactionVoice[] = [
  { text: 'Round two!', label: 'Round two' },
  { text: 'Keep going!', label: 'Keep going' },
  { text: 'You’re on a roll!', label: 'On a roll' },
]

export function pickVoice(pool: ReactionVoice[], avoidLabel?: string): string {
  const filtered = pool.length > 1 && avoidLabel ? pool.filter((v) => v.label !== avoidLabel) : pool
  return filtered[Math.floor(Math.random() * filtered.length)]?.text ?? pool[0]!.text
}
