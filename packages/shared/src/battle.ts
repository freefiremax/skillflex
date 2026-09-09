/**
 * Gamified battles — spelling, sentence, quiz.
 *
 * These are practice drills wearing a party hat. The point is not to grade the
 * student (the platform has no AI scoring; see C1) but to make re-testing
 * yourself feel like a game instead of a test. For that reason every judgment
 * here is OBJECTIVE and CLIENT-SIDE — there is no phoneme-scorer, no LLM
 * rubric, no server deciding what "good" means. A spelling answer is right or
 * wrong against a fixed string; a quiz answer is right or wrong against a fixed
 * option index. Nothing a machine judges features anywhere in the scoring path.
 *
 * Pronunciation "battle" reuses the same `judgePronunciation` as the drill —
 * which is itself client-side and returns a verdict, not a score — so it does
 * not live here. This module carries the two new games plus the word bank the
 * spelling game draws from.
 */

// ---------------------------------------------------------------------------
// Word bank for the SPELLING battle.
// ---------------------------------------------------------------------------

export interface SpellingWord {
  id: string
  word: string
  /** A one-line everyday clue, e.g. "the study of weather". */
  clue: string
  /** The word broken into syllables, for the hint. */
  syllables: string[]
}

const W = (id: string, word: string, clue: string, syllables: string[]): SpellingWord => ({
  id,
  word,
  clue,
  syllables,
})

export const SPELLING_WORDS: SpellingWord[] = [
  W('necessary', 'necessary', 'something you must have — and a nerve-centre of spelling traps', ['nec', 'es', 'sa', 'ry']),
  W('definitely', 'definitely', 'without any doubt — two a’s, never "definately"', ['def', 'i', 'nite', 'ly']),
  W('separate', 'separate', 'to keep apart — there’s an "a" hiding after the e', ['sep', 'a', 'rate']),
  W('embarrass', 'embarrass', 'to make someone feel shy or awkward — double r, double s', ['em', 'bar', 'rass']),
  W('accommodate', 'accommodate', 'to make room for — one c, two m’s', ['ac', 'com', 'mo', 'date']),
  W('receive', 'receive', 'to get something — i before e, except after c', ['re', 'ceive']),
  W('surprise', 'surprise', 'an unexpected event — the r comes FIRST, not after the u', ['sur', 'prise']),
  W('calendar', 'calendar', 'the months of the year — ends in -ar, not -er', ['cal', 'en', 'dar']),
  W('privilege', 'privilege', 'a special right — the quiet "g" after the i', ['priv', 'i', 'lege']),
  W('restaurant', 'restaurant', 'where you eat out — au, not ou', ['res', 'tau', 'rant']),
  W('Wednesday', 'Wednesday', 'the middle of the week — the d is silent, not missing', ['Wednes', 'day']),
  W('temperature', 'temperature', 'how hot or cold it is — -per- in the middle, not -pur-', ['tem', 'per', 'a', 'ture']),
  W('occurrence', 'occurrence', 'something that happens — two c’s, two r’s', ['oc', 'cur', 'rence']),
  W('decision', 'decision', 'a choice you make — s sounds like "zh"', ['de', 'ci', 'sion']),
  W('environment', 'environment', 'the world around you — nvir, not nviro', ['en', 'vi', 'ron', 'ment']),
  W('recommend', 'recommend', 'to suggest something good — one c, two m’s', ['rec', 'om', 'mend']),
]

// ---------------------------------------------------------------------------
// SENTENCE game.
// ---------------------------------------------------------------------------

/**
 * A sentence-completion challenge. The student sees a sentence with one blank
 * and picks the word that fits. All the distractors are plausible in isolation
 * but wrong here, so the answer is judgeable against the meaning of the whole
 * sentence rather than by word ownership.
 */
export interface SentenceQuestion {
  id: string
  /** The sentence with a `____` blank in place of the missing word. */
  sentence: string
  /** The word that completes it. */
  answer: string
  /** Plausible-but-wrong options. */
  distractors: string[]
  /** A one-line reason the answer fits. */
  why: string
}

export const SENTENCE_QUESTIONS: SentenceQuestion[] = [
  {
    id: 'sent-lend',
    sentence: 'Can you ____ me your pen for a moment?',
    answer: 'lend',
    distractors: ['loan', 'borrow', 'give'],
    why: '“Lend” is what the speaker does; “borrow” is what the listener would do.',
  },
  {
    id: 'sent-advice',
    sentence: 'My mentor gave me some ____ about the interview.',
    answer: 'advice',
    distractors: ['advise', 'suggestion', 'recommend'],
    why: '“Advice” is the noun; “advise” is the verb.',
  },
  {
    id: 'sent-affect',
    sentence: 'Lack of sleep can ____ your concentration.',
    answer: 'affect',
    distractors: ['effect', 'impact', 'reflect'],
    why: '“Affect” is the verb (to change something); “effect” is the noun (the result).',
  },
  {
    id: 'sent-farther',
    sentence: 'The hostel is ____ from campus than the canteen.',
    answer: 'farther',
    distractors: ['further', 'closer', 'nearer'],
    why: '“Farther” is for physical distance; “further” is for degree or extent.',
  },
  {
    id: 'sent-peace',
    sentence: 'The two teams finally made ____ after the argument.',
    answer: 'peace',
    distractors: ['piece', 'peas', 'pacify'],
    why: '“Peace” is the noun for harmony; “piece” is a part of something.',
  },
  {
    id: 'sent-everybody',
    sentence: '____ knows the exam starts at nine.',
    answer: 'Everybody',
    distractors: ['Every body', 'No one', 'Somebody'],
    why: '“Everybody” is one word meaning everyone.',
  },
  {
    id: 'sent-brought',
    sentence: 'She ____ her notes to the group discussion.',
    answer: 'brought',
    distractors: ['bought', 'boughten', 'brang'],
    why: '“Brought” is the past of “bring”; “bought” is the past of “buy”.',
  },
  {
    id: 'sent-its',
    sentence: 'The company improved ____ training program.',
    answer: 'its',
    distractors: ['it’s', 'its’', 'it is'],
    why: '“Its” is possessive; “it’s” is the contraction of “it is”.',
  },
  {
    id: 'sent-quiet',
    sentence: 'Please be ____ — the lecture is about to start.',
    answer: 'quiet',
    distractors: ['quite', 'quit', 'queue'],
    why: '“Quiet” means making little noise; “quite” means very.',
  },
  {
    id: 'sent-who',
    sentence: '____ is calling at the door?',
    answer: 'Who',
    distractors: ['Whom', 'Whose', 'Which'],
    why: '“Who” is the subject; “whom” is the object. Here the speaker is the subject.',
  },
]

// ---------------------------------------------------------------------------
// SOFT-SKILL QUIZ.
// ---------------------------------------------------------------------------

export interface QuizQuestion {
  id: string
  /** The prompt, phrased as a scenario or a definition. */
  prompt: string
  options: string[]
  /** Index into `options` — the fixed, objective correct answer. */
  answerIndex: number
  /** A one-line explanation of why. */
  why: string
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'quiz-listening',
    prompt: 'In a group discussion, the best way to respond to someone’s point is to…',
    options: [
      'Cut them off before they finish',
      'Wait, then build on what they said',
      'Immediately disagree to be noticed',
      'Stay silent so you don’t commit',
    ],
    answerIndex: 1,
    why: 'A good GD shows you listened. Building on an earlier point demonstrates it.',
  },
  {
    id: 'quiz-negotiation',
    prompt: 'Your teammate missed a deadline. The most professional first step is to…',
    options: [
      'Report them to the mentor',
      'Re-do the work yourself quietly',
      'Ask what got in the way and how to help',
      'Ignore it — it’s not your problem',
    ],
    answerIndex: 2,
    why: 'Assume good intent and address the cause. Escalating first skips the actual problem.',
  },
  {
    id: 'quiz-email',
    prompt: 'A professional email about a delay should…',
    options: [
      'Explain, apologise briefly, and give a new date',
      'Blame the bad Wi-Fi and say nothing else',
      'Wait and only tell them if they ask',
      'Say sorry three times and no plan',
    ],
    answerIndex: 0,
    why: 'Brief accountability plus a concrete next step keeps trust.',
  },
  {
    id: 'quiz-conflict',
    prompt: 'Two teammates are arguing in a meeting. The neutral thing to steer is…',
    options: [
      '"You’re both wrong"',
      '"Let’s each say our ideal outcome"',
      '"Whichever of you is louder"',
      '"This meeting is over"',
    ],
    answerIndex: 1,
    why: 'Reframing to needs, not positions, turns a fight into a negotiation.',
  },
  {
    id: 'quiz-interview',
    prompt: 'In an interview, "tell me about a weakness" is best answered by…',
    options: [
      '"I have none — I’m perfect"',
      'A real weakness plus how you manage it',
      'The weakness the interviewer has',
      'A long list of your flaws',
    ],
    answerIndex: 1,
    why: 'Honesty with a mitigation shows self-awareness and growth.',
  },
  {
    id: 'quiz-intro',
    prompt: 'A good self-introduction in English for placement season should…',
    options: [
      'Recite your entire CV from the top',
      'Say your name, field, one strength, and one goal',
      'Only say your name',
      'Tell your whole life story',
    ],
    answerIndex: 1,
    why: 'Short and structured. They can always ask for more — that’s the hook.',
  },
  {
    id: 'quiz-body',
    prompt: 'During a presentation, your hands are doing what reads best to a room?',
    options: [
      'Fidgeting with a pen',
      'Crossed over your chest',
      'Open, palms up and relaxed',
      'Stuffed in your pockets',
    ],
    answerIndex: 2,
    why: 'Open gestures signal openness and confidence; crossed arms read as closed.',
  },
  {
    id: 'quiz-feedback',
    prompt: 'When your mentor gives hard feedback, the best first reaction is…',
    options: [
      'Defend each point immediately',
      'Tune out — it’s just one opinion',
      'Listen, then ask a clarifying question',
      'Agree loudly without thinking',
    ],
    answerIndex: 2,
    why: 'Listen first. One clarifying question turns criticism into an actionable step.',
  },
  {
    id: 'quiz-silence',
    prompt: 'You disagree with the team’s final decision but it’s theirs to make. You should…',
    options: [
      'Sabotage it quietly',
      'Voice your concern once, then commit',
      'Refuse to work',
      'Keep arguing after the decision',
    ],
    answerIndex: 1,
    why: 'Disagree, then commit. Raising one clear concern is honest; relitigating is not.',
  },
  {
    id: 'quiz-respond',
    prompt: 'The most persuasive way to present a proposal is…',
    options: [
      'As a pile of data with no story',
      'As "here’s the problem, here’s the fix, here’s the cost"',
      'As a vague "this might be good"',
      'As "everyone else does it"',
    ],
    answerIndex: 1,
    why: 'Problem → solution → cost is the order that lets a listener say yes.',
  },
]
