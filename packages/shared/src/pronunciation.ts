/**
 * Pronunciation practice: the word bank and the pure judging logic.
 *
 * Lives in `shared` for the usual reason — the API validates word ids against
 * the same list the React app renders, so there is one definition of what a
 * practisable word is.
 *
 * ## What this can and cannot do
 *
 * The engine underneath is the browser's `SpeechRecognition`, which is
 * word-level and biased toward returning real dictionary words. A word said
 * *slightly* wrong very often comes back transcribed correctly. So:
 *
 *   - a `clear` verdict means "no error was detected", NEVER "you said it
 *     perfectly", and the UI is required to say so;
 *   - errors are localised to a SYLLABLE, not a phoneme. Per-phoneme scoring
 *     needs a cloud model (Azure's Pronunciation Assessment is the obvious
 *     one). `judgePronunciation` is deliberately pure and engine-agnostic so
 *     that adapter can be dropped in later without the UI changing.
 *
 * This is a drill, not an assessment. Nothing here produces a score, and
 * `PronunciationAttempt` has no column to put one in — see docs/data-model.md.
 */

export const PRACTICE_GROUPS = ['dropped_syllable', 'silent_letter', 'stress', 'sound'] as const
export type PracticeGroup = (typeof PRACTICE_GROUPS)[number]

export const PRACTICE_GROUP_LABELS: Record<PracticeGroup, string> = {
  dropped_syllable: 'Syllables that vanish',
  silent_letter: 'Silent letters',
  stress: 'Where the stress goes',
  sound: 'Tricky sounds',
}

/** A hand-written diagnosis, matched against what the recogniser actually heard. */
export interface PracticeError {
  /** Free-form spellings of the mistake. Compared after normalisation, so
   *  "veggie table" and "Veggie-Table" are the same entry. */
  heardLike: string[]
  /** Index into `spellingSyllables` — what to highlight. */
  syllableIndex: number
  /** Told to the student verbatim. Names the fix, not just the fault. */
  note: string
}

export interface PracticeWord {
  id: string
  word: string
  group: PracticeGroup
  /**
   * INVARIANT: `spellingSyllables.join('') === word`, exactly, including case.
   * This is what maps a character index back to a syllable for highlighting, so
   * a split that loses or adds a letter silently mis-highlights.
   */
  spellingSyllables: string[]
  /** Display only. Caps mark the stressed syllable: "VEJ-tuh-buhl". */
  respelling: string
  ipa: string
  /** One line of advice, shown before the student ever opens their mouth. */
  hint: string
  commonErrors: PracticeError[]
}

/**
 * ~80 words, chosen because Indian English speakers are documented as diverging
 * on them in ways that cost intelligibility — not because they diverge from an
 * American accent. The reference is Indian English throughout. Nothing in here
 * is trying to flatten anyone's accent; the goal is being understood.
 */
export const PRACTICE_WORDS: PracticeWord[] = [
  // --- Syllables that vanish in natural speech --------------------------
  {
    id: 'vegetable',
    word: 'vegetable',
    group: 'dropped_syllable',
    spellingSyllables: ['veg', 'e', 'ta', 'ble'],
    respelling: 'VEJ-tuh-buhl',
    ipa: '/ˈvedʒtəbl/',
    hint: 'Three syllables, not four. The middle "e" disappears completely.',
    commonErrors: [
      {
        heardLike: ['veggie table', 'veggietable', 'vegi table', 'vegetables'],
        syllableIndex: 1,
        note: 'You are sounding the middle "e". Drop it: VEJ-tuh-buhl, as if it were "vej" + "table".',
      },
    ],
  },
  {
    id: 'comfortable',
    word: 'comfortable',
    group: 'dropped_syllable',
    spellingSyllables: ['com', 'for', 'ta', 'ble'],
    respelling: 'KUMF-tuh-buhl',
    ipa: '/ˈkʌmftəbl/',
    hint: 'Three syllables. Nobody says "com-for-TAY-bul".',
    commonErrors: [
      {
        heardLike: ['comfort table', 'comfortabel', 'com for table'],
        syllableIndex: 1,
        note: 'The "for" collapses into almost nothing: KUMF-tuh-buhl. Stress lands on the first syllable.',
      },
    ],
  },
  {
    id: 'temperature',
    word: 'temperature',
    group: 'dropped_syllable',
    spellingSyllables: ['tem', 'per', 'a', 'ture'],
    respelling: 'TEM-pruh-cher',
    ipa: '/ˈtemprətʃə/',
    hint: 'Three syllables. The "a" is swallowed.',
    commonErrors: [
      {
        heardLike: ['temperator', 'tempreture', 'temparature'],
        syllableIndex: 2,
        note: 'Say TEM-pruh-cher. The ending is "cher", like the start of "cherry".',
      },
    ],
  },
  {
    id: 'literature',
    word: 'literature',
    group: 'dropped_syllable',
    spellingSyllables: ['lit', 'er', 'a', 'ture'],
    respelling: 'LIT-ruh-cher',
    ipa: '/ˈlɪtrətʃə/',
    hint: 'Three syllables, stress on the first.',
    commonErrors: [
      {
        heardLike: ['litreture', 'literatur', 'litrature'],
        syllableIndex: 1,
        note: 'LIT-ruh-cher. Same "cher" ending as "temperature".',
      },
    ],
  },
  {
    id: 'interesting',
    word: 'interesting',
    group: 'dropped_syllable',
    spellingSyllables: ['in', 'ter', 'est', 'ing'],
    respelling: 'IN-truh-sting',
    ipa: '/ˈɪntrəstɪŋ/',
    hint: 'Stress hits the very first syllable, hard.',
    commonErrors: [
      {
        heardLike: ['interested', 'intresting', 'in tresting'],
        syllableIndex: 0,
        note: 'IN-truh-sting — punch the "IN". Putting the stress later is the commonest version of this word.',
      },
    ],
  },
  {
    id: 'restaurant',
    word: 'restaurant',
    group: 'dropped_syllable',
    spellingSyllables: ['res', 'tau', 'rant'],
    respelling: 'RES-tronht',
    ipa: '/ˈrestrɒnt/',
    hint: 'Two and a half syllables. The "au" barely exists.',
    commonErrors: [
      {
        heardLike: ['restorent', 'restaurent', 'res to rant'],
        syllableIndex: 1,
        note: 'RES-tronht. Do not give "tau" a full beat of its own.',
      },
    ],
  },
  {
    id: 'february',
    word: 'February',
    group: 'dropped_syllable',
    spellingSyllables: ['Feb', 'ru', 'a', 'ry'],
    respelling: 'FEB-roo-ree',
    ipa: '/ˈfebruəri/',
    hint: 'Three syllables. The second "r" is usually skipped.',
    commonErrors: [
      {
        heardLike: ['febuary', 'febrary', 'feb ruary'],
        syllableIndex: 1,
        note: 'FEB-roo-ree. Keep the first "r" — dropping it gives "Feb-you-ary".',
      },
    ],
  },
  {
    id: 'chocolate',
    word: 'chocolate',
    group: 'dropped_syllable',
    spellingSyllables: ['choc', 'o', 'late'],
    respelling: 'CHOK-lut',
    ipa: '/ˈtʃɒklət/',
    hint: 'Two syllables. The middle "o" is gone.',
    commonErrors: [
      {
        heardLike: ['choco late', 'chocolatte', 'chocklet'],
        syllableIndex: 1,
        note: 'CHOK-lut. The ending rhymes with "but", not with "late".',
      },
    ],
  },
  {
    id: 'business',
    word: 'business',
    group: 'dropped_syllable',
    spellingSyllables: ['busi', 'ness'],
    respelling: 'BIZ-nis',
    ipa: '/ˈbɪznəs/',
    hint: 'Two syllables, and it starts "biz", not "buzi".',
    commonErrors: [
      {
        heardLike: ['busyness', 'bussiness', 'busi ness'],
        syllableIndex: 0,
        note: 'BIZ-nis. Two syllables only — the "i" in the middle vanishes.',
      },
    ],
  },
  {
    id: 'wednesday',
    word: 'Wednesday',
    group: 'dropped_syllable',
    spellingSyllables: ['Wed', 'nes', 'day'],
    respelling: 'WENZ-day',
    ipa: '/ˈwenzdeɪ/',
    hint: 'Two syllables. The first "d" is silent.',
    commonErrors: [
      {
        heardLike: ['wed nes day', 'wednes day', 'wednessday'],
        syllableIndex: 0,
        note: 'WENZ-day. Nothing between "Wen" and "z".',
      },
    ],
  },
  {
    id: 'probably',
    word: 'probably',
    group: 'dropped_syllable',
    spellingSyllables: ['prob', 'a', 'bly'],
    respelling: 'PROB-uh-blee',
    ipa: '/ˈprɒbəbli/',
    hint: 'Stress the first syllable; the rest runs together.',
    commonErrors: [
      {
        heardLike: ['probly', 'probaly', 'prolly'],
        syllableIndex: 1,
        note: 'Keep a light "uh" in the middle: PROB-uh-blee.',
      },
    ],
  },
  {
    id: 'basically',
    word: 'basically',
    group: 'dropped_syllable',
    spellingSyllables: ['ba', 'si', 'cal', 'ly'],
    respelling: 'BAY-sik-lee',
    ipa: '/ˈbeɪsɪkli/',
    hint: 'Three syllables. There is no "al" sound in the middle.',
    commonErrors: [
      {
        heardLike: ['basic ally', 'basicalee', 'basical'],
        syllableIndex: 2,
        note: 'BAY-sik-lee — "cal" and "ly" merge into one "klee".',
      },
    ],
  },
  {
    id: 'separate',
    word: 'separate',
    group: 'dropped_syllable',
    spellingSyllables: ['sep', 'a', 'rate'],
    respelling: 'SEP-ruht (adjective)',
    ipa: '/ˈseprət/',
    hint: 'As an adjective it is two syllables and ends "ruht", not "rate".',
    commonErrors: [
      {
        heardLike: ['seperate', 'sep a rate', 'separated'],
        syllableIndex: 2,
        note: 'For the adjective say SEP-ruht. Only the verb ends with a clear "rate".',
      },
    ],
  },
  {
    id: 'library',
    word: 'library',
    group: 'dropped_syllable',
    spellingSyllables: ['li', 'bra', 'ry'],
    respelling: 'LY-bruh-ree',
    ipa: '/ˈlaɪbrəri/',
    hint: 'Both "r"s get said.',
    commonErrors: [
      {
        heardLike: ['libary', 'librey', 'liberry'],
        syllableIndex: 1,
        note: 'LY-bruh-ree. Dropping the first "r" gives "li-bary".',
      },
    ],
  },
  {
    id: 'government',
    word: 'government',
    group: 'dropped_syllable',
    spellingSyllables: ['gov', 'ern', 'ment'],
    respelling: 'GUV-ern-muhnt',
    ipa: '/ˈɡʌvənmənt/',
    hint: 'Starts "guv", and the "n" before "ment" stays.',
    commonErrors: [
      {
        heardLike: ['goverment', 'govermant', 'gov ment'],
        syllableIndex: 1,
        note: 'Keep the "n": GUV-ern-muhnt, not "guv-er-ment".',
      },
    ],
  },
  {
    id: 'jewellery',
    word: 'jewellery',
    group: 'dropped_syllable',
    spellingSyllables: ['jew', 'el', 'ler', 'y'],
    respelling: 'JOOL-ree',
    ipa: '/ˈdʒuːlri/',
    hint: 'Two syllables, despite the spelling.',
    commonErrors: [
      {
        heardLike: ['jewelery', 'joo el ery', 'jewelry'],
        syllableIndex: 1,
        note: 'JOOL-ree. Do not give "el" its own beat.',
      },
    ],
  },
  {
    id: 'usually',
    word: 'usually',
    group: 'dropped_syllable',
    spellingSyllables: ['u', 'su', 'al', 'ly'],
    respelling: 'YOO-zhoo-uh-lee',
    ipa: '/ˈjuːʒuəli/',
    hint: 'The "s" is a soft "zh", like the middle of "measure".',
    commonErrors: [
      {
        heardLike: ['usualy', 'usally', 'you shually'],
        syllableIndex: 1,
        note: 'YOO-zhoo-uh-lee. A "zh", not a "sh" and not a hard "s".',
      },
    ],
  },

  // --- Silent letters ---------------------------------------------------
  {
    id: 'subtle',
    word: 'subtle',
    group: 'silent_letter',
    spellingSyllables: ['sub', 'tle'],
    respelling: 'SUT-uhl',
    ipa: '/ˈsʌtl/',
    hint: 'The "b" is silent.',
    commonErrors: [
      {
        heardLike: ['sub tell', 'subtel', 'subtitle'],
        syllableIndex: 0,
        note: 'No "b" sound at all: SUT-uhl, rhyming with "cuttle".',
      },
    ],
  },
  {
    id: 'receipt',
    word: 'receipt',
    group: 'silent_letter',
    spellingSyllables: ['re', 'ceipt'],
    respelling: 'ri-SEET',
    ipa: '/rɪˈsiːt/',
    hint: 'The "p" is silent.',
    commonErrors: [
      {
        heardLike: ['receipt p', 'recept', 'receipe', 'recipe'],
        syllableIndex: 1,
        note: 'ri-SEET. No "p" — and it is not the same word as "recipe".',
      },
    ],
  },
  {
    id: 'island',
    word: 'island',
    group: 'silent_letter',
    spellingSyllables: ['is', 'land'],
    respelling: 'EYE-luhnd',
    ipa: '/ˈaɪlənd/',
    hint: 'The "s" is silent.',
    commonErrors: [
      {
        heardLike: ['is land', 'issland', 'iceland'],
        syllableIndex: 0,
        note: 'EYE-luhnd. Starts like the word "I".',
      },
    ],
  },
  {
    id: 'salmon',
    word: 'salmon',
    group: 'silent_letter',
    spellingSyllables: ['sal', 'mon'],
    respelling: 'SAM-uhn',
    ipa: '/ˈsæmən/',
    hint: 'The "l" is silent.',
    commonErrors: [
      {
        heardLike: ['sal mon', 'salmon fish', 'sallmon'],
        syllableIndex: 0,
        note: 'SAM-uhn. No "l" sound — it rhymes with "gammon".',
      },
    ],
  },
  {
    id: 'honest',
    word: 'honest',
    group: 'silent_letter',
    spellingSyllables: ['hon', 'est'],
    respelling: 'ON-ist',
    ipa: '/ˈɒnɪst/',
    hint: 'The "h" is silent.',
    commonErrors: [
      {
        heardLike: ['ho nest', 'honnest', 'harnest'],
        syllableIndex: 0,
        note: 'ON-ist. Begin with the vowel, no breath of "h".',
      },
    ],
  },
  {
    id: 'knowledge',
    word: 'knowledge',
    group: 'silent_letter',
    spellingSyllables: ['know', 'ledge'],
    respelling: 'NOL-ij',
    ipa: '/ˈnɒlɪdʒ/',
    hint: 'The "k" is silent, and the first vowel is short.',
    commonErrors: [
      {
        heardLike: ['know ledge', 'knowlege', 'no ledge'],
        syllableIndex: 0,
        note: 'NOL-ij, not "know-ledge". The first syllable rhymes with "doll".',
      },
    ],
  },
  {
    id: 'muscle',
    word: 'muscle',
    group: 'silent_letter',
    spellingSyllables: ['mus', 'cle'],
    respelling: 'MUS-uhl',
    ipa: '/ˈmʌsl/',
    hint: 'The "c" is silent.',
    commonErrors: [
      {
        heardLike: ['mus cle', 'musscle', 'muskle'],
        syllableIndex: 1,
        note: 'MUS-uhl — it sounds exactly like "mussel".',
      },
    ],
  },
  {
    id: 'debt',
    word: 'debt',
    group: 'silent_letter',
    spellingSyllables: ['debt'],
    respelling: 'DET',
    ipa: '/det/',
    hint: 'The "b" is silent.',
    commonErrors: [
      {
        heardLike: ['debit', 'debbt', 'dept'],
        syllableIndex: 0,
        note: 'DET, rhyming with "bet". No "b" and no "p".',
      },
    ],
  },
  {
    id: 'doubt',
    word: 'doubt',
    group: 'silent_letter',
    spellingSyllables: ['doubt'],
    respelling: 'DOWT',
    ipa: '/daʊt/',
    hint: 'The "b" is silent.',
    commonErrors: [
      {
        heardLike: ['doubt b', 'dowbt', 'dout b'],
        syllableIndex: 0,
        note: 'DOWT, rhyming with "out".',
      },
    ],
  },
  {
    id: 'climb',
    word: 'climb',
    group: 'silent_letter',
    spellingSyllables: ['climb'],
    respelling: 'KLYME',
    ipa: '/klaɪm/',
    hint: 'The "b" is silent.',
    commonErrors: [
      {
        heardLike: ['climb b', 'climber', 'clim'],
        syllableIndex: 0,
        note: 'KLYME — it sounds identical to "clime" and rhymes with "time".',
      },
    ],
  },
  {
    id: 'answer',
    word: 'answer',
    group: 'silent_letter',
    spellingSyllables: ['an', 'swer'],
    respelling: 'AN-ser',
    ipa: '/ˈɑːnsə/',
    hint: 'The "w" is silent.',
    commonErrors: [
      {
        heardLike: ['ans wer', 'answar', 'an swear'],
        syllableIndex: 1,
        note: 'AN-ser. No "w" sound between the "s" and the "e".',
      },
    ],
  },
  {
    id: 'often',
    word: 'often',
    group: 'silent_letter',
    spellingSyllables: ['of', 'ten'],
    respelling: 'OF-uhn',
    ipa: '/ˈɒfən/',
    hint: 'The "t" is usually silent. Both versions are accepted, but this one is safer.',
    commonErrors: [
      {
        heardLike: ['of ten', 'oftin', 'oven'],
        syllableIndex: 1,
        note: 'OF-uhn. Sounding the "t" is not wrong, but it is much less common.',
      },
    ],
  },
  {
    id: 'listen',
    word: 'listen',
    group: 'silent_letter',
    spellingSyllables: ['lis', 'ten'],
    respelling: 'LIS-uhn',
    ipa: '/ˈlɪsn/',
    hint: 'The "t" is silent.',
    commonErrors: [
      {
        heardLike: ['lis ten', 'listin', 'listened'],
        syllableIndex: 1,
        note: 'LIS-uhn. No "t" — same pattern as "castle" and "whistle".',
      },
    ],
  },
  {
    id: 'castle',
    word: 'castle',
    group: 'silent_letter',
    spellingSyllables: ['cas', 'tle'],
    respelling: 'KAH-suhl',
    ipa: '/ˈkɑːsl/',
    hint: 'The "t" is silent.',
    commonErrors: [
      {
        heardLike: ['cas tle', 'castel', 'cattle'],
        syllableIndex: 1,
        note: 'KAH-suhl. No "t" sound at all.',
      },
    ],
  },
  {
    id: 'colonel',
    word: 'colonel',
    group: 'silent_letter',
    spellingSyllables: ['co', 'lo', 'nel'],
    respelling: 'KER-nuhl',
    ipa: '/ˈkɜːnl/',
    hint: 'Two syllables, and it sounds like "kernel".',
    commonErrors: [
      {
        heardLike: ['colonial', 'co lo nel', 'colonel sanders'],
        syllableIndex: 0,
        note: 'KER-nuhl. The spelling gives you no help here — it just has to be learned.',
      },
    ],
  },
  {
    id: 'queue',
    word: 'queue',
    group: 'silent_letter',
    spellingSyllables: ['queue'],
    respelling: 'KYOO',
    ipa: '/kjuː/',
    hint: 'One syllable. Four of the five letters are silent.',
    commonErrors: [
      {
        heardLike: ['q u e u e', 'kwew', 'kway'],
        syllableIndex: 0,
        note: 'KYOO — exactly like the letter "Q".',
      },
    ],
  },
  {
    id: 'gauge',
    word: 'gauge',
    group: 'silent_letter',
    spellingSyllables: ['gauge'],
    respelling: 'GAYJ',
    ipa: '/ɡeɪdʒ/',
    hint: 'One syllable, rhymes with "cage".',
    commonErrors: [
      {
        heardLike: ['gouge', 'gawge', 'garage'],
        syllableIndex: 0,
        note: 'GAYJ. The "au" says "ay", not "ow".',
      },
    ],
  },

  // --- Where the stress goes -------------------------------------------
  {
    id: 'development',
    word: 'development',
    group: 'stress',
    spellingSyllables: ['de', 'vel', 'op', 'ment'],
    respelling: 'di-VEL-uhp-muhnt',
    ipa: '/dɪˈveləpmənt/',
    hint: 'Stress the second syllable: VEL.',
    commonErrors: [
      {
        heardLike: ['develop mint', 'devlopment', 'development s'],
        syllableIndex: 1,
        note: 'Punch "VEL": di-VEL-uhp-muhnt. Stressing the first or last syllable is the usual slip.',
      },
    ],
  },
  {
    id: 'opportunity',
    word: 'opportunity',
    group: 'stress',
    spellingSyllables: ['op', 'por', 'tu', 'ni', 'ty'],
    respelling: 'op-er-TYOO-ni-tee',
    ipa: '/ˌɒpəˈtjuːnəti/',
    hint: 'Stress the third syllable: TYOO.',
    commonErrors: [
      {
        heardLike: ['opportunities', 'oppurtunity', 'opper tunity'],
        syllableIndex: 2,
        note: 'The beat lands on TYOO — op-er-TYOO-ni-tee.',
      },
    ],
  },
  {
    id: 'available',
    word: 'available',
    group: 'stress',
    spellingSyllables: ['a', 'vail', 'a', 'ble'],
    respelling: 'uh-VAY-luh-buhl',
    ipa: '/əˈveɪləbl/',
    hint: 'Stress the second syllable: VAY.',
    commonErrors: [
      {
        heardLike: ['availabe', 'availble', 'a vailable'],
        syllableIndex: 1,
        note: 'uh-VAY-luh-buhl. The first syllable is a tiny "uh", not a full "ay".',
      },
    ],
  },
  {
    id: 'necessary',
    word: 'necessary',
    group: 'stress',
    spellingSyllables: ['nec', 'es', 'sa', 'ry'],
    respelling: 'NES-uh-ser-ee',
    ipa: '/ˈnesəsəri/',
    hint: 'Stress the first syllable: NES.',
    commonErrors: [
      {
        heardLike: ['necessery', 'nessesary', 'nece ssary'],
        syllableIndex: 0,
        note: 'NES-uh-ser-ee — first syllable takes the weight.',
      },
    ],
  },
  {
    id: 'committee',
    word: 'committee',
    group: 'stress',
    spellingSyllables: ['com', 'mit', 'tee'],
    respelling: 'kuh-MIT-ee',
    ipa: '/kəˈmɪti/',
    hint: 'Stress the middle: MIT.',
    commonErrors: [
      {
        heardLike: ['committe', 'comitee', 'commit tea'],
        syllableIndex: 1,
        note: 'kuh-MIT-ee. The last syllable is a short "ee", not a full "tea".',
      },
    ],
  },
  {
    id: 'percentage',
    word: 'percentage',
    group: 'stress',
    spellingSyllables: ['per', 'cen', 'tage'],
    respelling: 'per-SEN-tij',
    ipa: '/pəˈsentɪdʒ/',
    hint: 'Stress the middle, and the ending is "tij".',
    commonErrors: [
      {
        heardLike: ['percentage e', 'per cent age', 'percentege'],
        syllableIndex: 2,
        note: 'per-SEN-tij. The ending rhymes with "ridge", not "age".',
      },
    ],
  },
  {
    id: 'category',
    word: 'category',
    group: 'stress',
    spellingSyllables: ['cat', 'e', 'go', 'ry'],
    respelling: 'KAT-uh-guh-ree',
    ipa: '/ˈkætəɡəri/',
    hint: 'Stress the first syllable: KAT.',
    commonErrors: [
      {
        heardLike: ['categary', 'cate gory', 'categories'],
        syllableIndex: 0,
        note: 'KAT-uh-guh-ree. Everything after "KAT" is light.',
      },
    ],
  },
  {
    id: 'comparable',
    word: 'comparable',
    group: 'stress',
    spellingSyllables: ['com', 'pa', 'ra', 'ble'],
    respelling: 'KOM-puh-ruh-buhl',
    ipa: '/ˈkɒmpərəbl/',
    hint: 'Stress the first syllable — not "com-PARE-able".',
    commonErrors: [
      {
        heardLike: ['compare able', 'comparible', 'com parable'],
        syllableIndex: 0,
        note: 'KOM-puh-ruh-buhl. The word "compare" is in there on paper, but not in the sound.',
      },
    ],
  },
  {
    id: 'photography',
    word: 'photography',
    group: 'stress',
    spellingSyllables: ['pho', 'tog', 'ra', 'phy'],
    respelling: 'fuh-TOG-ruh-fee',
    ipa: '/fəˈtɒɡrəfi/',
    hint: 'Stress the second syllable — unlike "photograph".',
    commonErrors: [
      {
        heardLike: ['photo graphy', 'photograph', 'fotography'],
        syllableIndex: 1,
        note: 'fuh-TOG-ruh-fee. "PHO-tograph" but "pho-TOG-raphy" — the stress moves.',
      },
    ],
  },
  {
    id: 'maintenance',
    word: 'maintenance',
    group: 'stress',
    spellingSyllables: ['main', 'te', 'nance'],
    respelling: 'MAYN-tuh-nuhns',
    ipa: '/ˈmeɪntənəns/',
    hint: 'Stress the first syllable. The verb "maintain" does not survive in here.',
    commonErrors: [
      {
        heardLike: ['maintainance', 'main tenance', 'maintainence'],
        syllableIndex: 1,
        note: 'MAYN-tuh-nuhns, not "main-TAIN-ance".',
      },
    ],
  },
  {
    id: 'pronunciation',
    word: 'pronunciation',
    group: 'stress',
    spellingSyllables: ['pro', 'nun', 'ci', 'a', 'tion'],
    respelling: 'pruh-nun-see-AY-shuhn',
    ipa: '/prəˌnʌnsiˈeɪʃn/',
    hint: 'The second syllable is "nun", not "nown".',
    commonErrors: [
      {
        heardLike: ['pronounciation', 'pro nounce iation', 'pronounce ation'],
        syllableIndex: 1,
        note: 'It is "nun", not "nown": pruh-nun-see-AY-shuhn. The verb is "pronounce" but the noun loses that sound.',
      },
    ],
  },
  {
    id: 'determine',
    word: 'determine',
    group: 'stress',
    spellingSyllables: ['de', 'ter', 'mine'],
    respelling: 'di-TER-min',
    ipa: '/dɪˈtɜːmɪn/',
    hint: 'The last syllable is "min", not "mine".',
    commonErrors: [
      {
        heardLike: ['determine e', 'deter mine', 'determined'],
        syllableIndex: 2,
        note: 'di-TER-min. The ending is short — it does not rhyme with "wine".',
      },
    ],
  },
  {
    id: 'machinery',
    word: 'machinery',
    group: 'stress',
    spellingSyllables: ['ma', 'chin', 'er', 'y'],
    respelling: 'muh-SHEE-nuh-ree',
    ipa: '/məˈʃiːnəri/',
    hint: 'The "ch" is "sh", and the stress is on SHEE.',
    commonErrors: [
      {
        heardLike: ['machine ary', 'macinery', 'mashinary'],
        syllableIndex: 1,
        note: 'muh-SHEE-nuh-ree. A "sh" sound, never a "ch" as in "chair".',
      },
    ],
  },
  {
    id: 'hospitality',
    word: 'hospitality',
    group: 'stress',
    spellingSyllables: ['hos', 'pi', 'tal', 'i', 'ty'],
    respelling: 'hos-pi-TAL-i-tee',
    ipa: '/ˌhɒspɪˈtæləti/',
    hint: 'Stress the third syllable: TAL.',
    commonErrors: [
      {
        heardLike: ['hospital ity', 'hospitalty', 'hospitality y'],
        syllableIndex: 2,
        note: 'hos-pi-TAL-i-tee. The beat sits on TAL, not on the start.',
      },
    ],
  },
  {
    id: 'epitome',
    word: 'epitome',
    group: 'stress',
    spellingSyllables: ['e', 'pit', 'o', 'me'],
    respelling: 'i-PIT-uh-mee',
    ipa: '/ɪˈpɪtəmi/',
    hint: 'Four syllables, and the ending is "mee".',
    commonErrors: [
      {
        heardLike: ['epi tome', 'epitomb', 'epi tomb'],
        syllableIndex: 3,
        note: 'i-PIT-uh-mee. It does not rhyme with "home".',
      },
    ],
  },
  {
    id: 'hyperbole',
    word: 'hyperbole',
    group: 'stress',
    spellingSyllables: ['hy', 'per', 'bo', 'le'],
    respelling: 'hy-PER-buh-lee',
    ipa: '/haɪˈpɜːbəli/',
    hint: 'Four syllables, ending "lee".',
    commonErrors: [
      {
        heardLike: ['hyper bowl', 'hyperbowl', 'hyper bole'],
        syllableIndex: 3,
        note: 'hy-PER-buh-lee. Not "hyper-bowl".',
      },
    ],
  },
  {
    id: 'resume',
    word: 'resume',
    group: 'stress',
    spellingSyllables: ['re', 'su', 'me'],
    respelling: 'REZ-oo-may (the document)',
    ipa: '/ˈrezjumeɪ/',
    hint: 'The document is REZ-oo-may. The verb "to resume" is ri-ZYOOM.',
    commonErrors: [
      {
        heardLike: ['resoom', 'ri zoom', 'resumed'],
        syllableIndex: 0,
        note: 'For the CV, say REZ-oo-may — three syllables. ri-ZYOOM means "to continue".',
      },
    ],
  },
  {
    id: 'career',
    word: 'career',
    group: 'stress',
    spellingSyllables: ['ca', 'reer'],
    respelling: 'kuh-REER',
    ipa: '/kəˈrɪə/',
    hint: 'Stress the second syllable. Not the same word as "carrier".',
    commonErrors: [
      {
        heardLike: ['carrier', 'karier', 'ca rear'],
        syllableIndex: 1,
        note: 'kuh-REER, rhyming with "near". "Carrier" is a different word entirely.',
      },
    ],
  },
  {
    id: 'crisis',
    word: 'crisis',
    group: 'stress',
    spellingSyllables: ['cri', 'sis'],
    respelling: 'KRY-sis',
    ipa: '/ˈkraɪsɪs/',
    hint: 'The first "i" is long, the second is short.',
    commonErrors: [
      {
        heardLike: ['crises', 'creesis', 'crisis s'],
        syllableIndex: 0,
        note: 'KRY-sis. The plural "crises" is KRY-seez.',
      },
    ],
  },

  // --- Tricky sounds ----------------------------------------------------
  {
    id: 'schedule',
    word: 'schedule',
    group: 'sound',
    spellingSyllables: ['sche', 'dule'],
    respelling: 'SKEJ-ool',
    ipa: '/ˈskedʒuːl/',
    hint: 'SKEJ-ool or SHED-yool — both are standard. Pick one and stay with it.',
    commonErrors: [
      {
        heardLike: ['shedule', 'skedual', 'scheduled'],
        syllableIndex: 0,
        note: 'SKEJ-ool is the more widely understood version. SHED-yool is also correct British English.',
      },
    ],
  },
  {
    id: 'entrepreneur',
    word: 'entrepreneur',
    group: 'sound',
    spellingSyllables: ['en', 'tre', 'pre', 'neur'],
    respelling: 'on-truh-pruh-NUR',
    ipa: '/ˌɒntrəprəˈnɜː/',
    hint: 'Four syllables, stress right at the end.',
    commonErrors: [
      {
        heardLike: ['entrepenur', 'enterpreneur', 'entre preneur'],
        syllableIndex: 3,
        note: 'on-truh-pruh-NUR. The stress is on the final syllable — unusual for English.',
      },
    ],
  },
  {
    id: 'genre',
    word: 'genre',
    group: 'sound',
    spellingSyllables: ['gen', 're'],
    respelling: 'ZHON-ruh',
    ipa: '/ˈʒɒnrə/',
    hint: 'Starts with a soft "zh", like the middle of "measure".',
    commonErrors: [
      {
        heardLike: ['gender', 'jenre', 'genere'],
        syllableIndex: 0,
        note: 'ZHON-ruh. No hard "j" and no "d" — it is a French borrowing.',
      },
    ],
  },
  {
    id: 'buffet',
    word: 'buffet',
    group: 'sound',
    spellingSyllables: ['buf', 'fet'],
    respelling: 'BUF-ay',
    ipa: '/ˈbʊfeɪ/',
    hint: 'The "t" is silent.',
    commonErrors: [
      {
        heardLike: ['buffett', 'buf fet', 'buffit'],
        syllableIndex: 1,
        note: 'BUF-ay. Sounding the "t" gives you the verb "to buffet", meaning to batter.',
      },
    ],
  },
  {
    id: 'niche',
    word: 'niche',
    group: 'sound',
    spellingSyllables: ['niche'],
    respelling: 'NEESH',
    ipa: '/niːʃ/',
    hint: 'One syllable, ending in "sh".',
    commonErrors: [
      {
        heardLike: ['nitch', 'nich', 'niece'],
        syllableIndex: 0,
        note: 'NEESH. "NITCH" is heard too, but "neesh" is safer in an interview.',
      },
    ],
  },
  {
    id: 'facade',
    word: 'facade',
    group: 'sound',
    spellingSyllables: ['fa', 'cade'],
    respelling: 'fuh-SAHD',
    ipa: '/fəˈsɑːd/',
    hint: 'The "c" is an "s".',
    commonErrors: [
      {
        heardLike: ['fakade', 'fa cade', 'facades'],
        syllableIndex: 1,
        note: 'fuh-SAHD. A "k" sound here is the commonest error.',
      },
    ],
  },
  {
    id: 'cache',
    word: 'cache',
    group: 'sound',
    spellingSyllables: ['cache'],
    respelling: 'KASH',
    ipa: '/kæʃ/',
    hint: 'One syllable. It sounds exactly like "cash".',
    commonErrors: [
      {
        heardLike: ['catch', 'cachet', 'ka shay'],
        syllableIndex: 0,
        note: 'KASH. Worth getting right — you will say this one in every technical interview.',
      },
    ],
  },
  {
    id: 'suite',
    word: 'suite',
    group: 'sound',
    spellingSyllables: ['suite'],
    respelling: 'SWEET',
    ipa: '/swiːt/',
    hint: 'It sounds like "sweet".',
    commonErrors: [
      {
        heardLike: ['suit', 'soot', 'su ite'],
        syllableIndex: 0,
        note: 'SWEET. "Suit" (SOOT) is a different word — a test suite is a "sweet".',
      },
    ],
  },
  {
    id: 'data',
    word: 'data',
    group: 'sound',
    spellingSyllables: ['da', 'ta'],
    respelling: 'DAY-tuh',
    ipa: '/ˈdeɪtə/',
    hint: 'DAY-tuh is the safest version. DAH-tuh is also accepted.',
    commonErrors: [
      {
        heardLike: ['daata', 'dater', 'the ta'],
        syllableIndex: 0,
        note: 'DAY-tuh. Both this and DAH-tuh are correct; DAY-tuh travels better.',
      },
    ],
  },
  {
    id: 'status',
    word: 'status',
    group: 'sound',
    spellingSyllables: ['sta', 'tus'],
    respelling: 'STAY-tus',
    ipa: '/ˈsteɪtəs/',
    hint: 'The first vowel is long: STAY.',
    commonErrors: [
      {
        heardLike: ['stattus', 'sta tus', 'statues'],
        syllableIndex: 0,
        note: 'STAY-tus. "Statues" is a different word.',
      },
    ],
  },
  {
    id: 'procedure',
    word: 'procedure',
    group: 'sound',
    spellingSyllables: ['pro', 'ce', 'dure'],
    respelling: 'pruh-SEE-jer',
    ipa: '/prəˈsiːdʒə/',
    hint: 'Three syllables, ending "jer".',
    commonErrors: [
      {
        heardLike: ['proceedure', 'pro ce dure', 'procedures'],
        syllableIndex: 2,
        note: 'pruh-SEE-jer. The ending is a soft "jer", like the end of "major".',
      },
    ],
  },
  {
    id: 'specific',
    word: 'specific',
    group: 'sound',
    spellingSyllables: ['spe', 'ci', 'fic'],
    respelling: 'spuh-SIF-ik',
    ipa: '/spəˈsɪfɪk/',
    hint: 'Starts "sp", not "p".',
    commonErrors: [
      {
        heardLike: ['pacific', 'pasific', 'spe cific'],
        syllableIndex: 0,
        note: 'spuh-SIF-ik. "Pacific" is an ocean — the "s" at the start matters.',
      },
    ],
  },
  {
    id: 'clothes',
    word: 'clothes',
    group: 'sound',
    spellingSyllables: ['clothes'],
    respelling: 'KLOHZ',
    ipa: '/kləʊðz/',
    hint: 'One syllable. It sounds almost exactly like "close".',
    commonErrors: [
      {
        heardLike: ['cloth es', 'clothe', 'cloths'],
        syllableIndex: 0,
        note: 'KLOHZ. No separate "th-es" beat at the end.',
      },
    ],
  },
  {
    id: 'strengths',
    word: 'strengths',
    group: 'sound',
    spellingSyllables: ['strengths'],
    respelling: 'STRENGKTHS',
    ipa: '/streŋkθs/',
    hint: 'One syllable, and every consonant at the end gets said.',
    commonErrors: [
      {
        heardLike: ['strength', 'strenths', 'strengs'],
        syllableIndex: 0,
        note: 'STRENGKTHS. You will need this in every interview — "my strengths are…".',
      },
    ],
  },
  {
    id: 'sixth',
    word: 'sixth',
    group: 'sound',
    spellingSyllables: ['sixth'],
    respelling: 'SIKSTH',
    ipa: '/sɪksθ/',
    hint: 'One syllable, ending in a "th" after the "ks".',
    commonErrors: [
      {
        heardLike: ['six', 'sikth', 'sixt'],
        syllableIndex: 0,
        note: 'SIKSTH. Say the "th" — otherwise it is just "six".',
      },
    ],
  },
  {
    id: 'asked',
    word: 'asked',
    group: 'sound',
    spellingSyllables: ['asked'],
    respelling: 'AASKT',
    ipa: '/ɑːskt/',
    hint: 'One syllable. The ending is a hard "kt".',
    commonErrors: [
      {
        heardLike: ['ask ed', 'axed', 'aksed'],
        syllableIndex: 0,
        note: 'AASKT. The "ed" is not a separate syllable, and the order is "sk", not "ks".',
      },
    ],
  },
  {
    id: 'months',
    word: 'months',
    group: 'sound',
    spellingSyllables: ['months'],
    respelling: 'MUNTHS',
    ipa: '/mʌnθs/',
    hint: 'One syllable, with the "th" and the "s" both said.',
    commonErrors: [
      {
        heardLike: ['month', 'monts', 'monthes'],
        syllableIndex: 0,
        note: 'MUNTHS. Six months, not "six month".',
      },
    ],
  },
  {
    id: 'film',
    word: 'film',
    group: 'sound',
    spellingSyllables: ['film'],
    respelling: 'FILM',
    ipa: '/fɪlm/',
    hint: 'One syllable. No vowel between the "l" and the "m".',
    commonErrors: [
      {
        heardLike: ['fillum', 'fill um', 'flim'],
        syllableIndex: 0,
        note: 'FILM, in one beat. Slipping a vowel in gives "fil-lum".',
      },
    ],
  },
  {
    id: 'world',
    word: 'world',
    group: 'sound',
    spellingSyllables: ['world'],
    respelling: 'WURLD',
    ipa: '/wɜːld/',
    hint: 'One syllable, with the "r" and "l" both audible.',
    commonErrors: [
      {
        heardLike: ['word', 'wold', 'whirled'],
        syllableIndex: 0,
        note: 'WURLD. Dropping the "l" makes it "word".',
      },
    ],
  },
  {
    id: 'squirrel',
    word: 'squirrel',
    group: 'sound',
    spellingSyllables: ['squir', 'rel'],
    respelling: 'SKWIR-uhl',
    ipa: '/ˈskwɪrəl/',
    hint: 'Two syllables, starting "skw".',
    commonErrors: [
      {
        heardLike: ['squirel', 'skwerl', 'square l'],
        syllableIndex: 0,
        note: 'SKWIR-uhl. The "qu" is a "kw" sound.',
      },
    ],
  },
  {
    id: 'rural',
    word: 'rural',
    group: 'sound',
    spellingSyllables: ['ru', 'ral'],
    respelling: 'ROOR-uhl',
    ipa: '/ˈrʊərəl/',
    hint: 'Two syllables with two separate "r"s. Slow down for this one.',
    commonErrors: [
      {
        heardLike: ['rule', 'roral', 'ru ral'],
        syllableIndex: 1,
        note: 'ROOR-uhl. Both "r"s get said — this is a hard word for everyone.',
      },
    ],
  },
  {
    id: 'three',
    word: 'three',
    group: 'sound',
    spellingSyllables: ['three'],
    respelling: 'THREE',
    ipa: '/θriː/',
    hint: 'Tongue lightly touching the teeth for the "th".',
    commonErrors: [
      {
        heardLike: ['tree', 'free', 'thee'],
        syllableIndex: 0,
        note: 'Put your tongue between your teeth and blow: THREE, not "tree".',
      },
    ],
  },
  {
    id: 'thirty',
    word: 'thirty',
    group: 'sound',
    spellingSyllables: ['thir', 'ty'],
    respelling: 'THUR-tee',
    ipa: '/ˈθɜːti/',
    hint: 'A "th" at the start, and stress on the first syllable.',
    commonErrors: [
      {
        heardLike: ['dirty', 'thirteen', 'turty'],
        syllableIndex: 0,
        note: 'THUR-tee. Note the stress: "THIR-ty" is 30, "thir-TEEN" is 13.',
      },
    ],
  },
  {
    id: 'water',
    word: 'water',
    group: 'sound',
    spellingSyllables: ['wa', 'ter'],
    respelling: 'WAW-ter',
    ipa: '/ˈwɔːtə/',
    hint: 'The first vowel is a long "aw".',
    commonErrors: [
      {
        heardLike: ['vater', 'wotter', 'what er'],
        syllableIndex: 0,
        note: 'WAW-ter. Round your lips for the "w" — a "v" sound gives "vater".',
      },
    ],
  },
  {
    id: 'very',
    word: 'very',
    group: 'sound',
    spellingSyllables: ['ve', 'ry'],
    respelling: 'VER-ee',
    ipa: '/ˈveri/',
    hint: 'Top teeth on bottom lip for the "v".',
    commonErrors: [
      {
        heardLike: ['wery', 'berry', 'fairy'],
        syllableIndex: 0,
        note: 'VER-ee. Teeth touch lip for "v"; lips round for "w". They are different sounds.',
      },
    ],
  },
  {
    id: 'pizza',
    word: 'pizza',
    group: 'sound',
    spellingSyllables: ['piz', 'za'],
    respelling: 'PEET-suh',
    ipa: '/ˈpiːtsə/',
    hint: 'The "zz" says "ts".',
    commonErrors: [
      {
        heardLike: ['pizaa', 'piza', 'peeza'],
        syllableIndex: 0,
        note: 'PEET-suh. An Italian borrowing — "ts", not "z".',
      },
    ],
  },
  {
    id: 'measure',
    word: 'measure',
    group: 'sound',
    spellingSyllables: ['mea', 'sure'],
    respelling: 'MEZH-er',
    ipa: '/ˈmeʒə/',
    hint: 'The "s" is a soft "zh".',
    commonErrors: [
      {
        heardLike: ['mesure', 'measur', 'major'],
        syllableIndex: 1,
        note: 'MEZH-er. The same sound sits inside "pleasure" and "vision".',
      },
    ],
  },
  {
    id: 'vision',
    word: 'vision',
    group: 'sound',
    spellingSyllables: ['vi', 'sion'],
    respelling: 'VIZH-uhn',
    ipa: '/ˈvɪʒn/',
    hint: 'A "zh" in the middle, and a "v" at the start.',
    commonErrors: [
      {
        heardLike: ['wision', 'vission', 'vishion'],
        syllableIndex: 1,
        note: 'VIZH-uhn. Not "vish" — it is the soft sound from "measure".',
      },
    ],
  },
  {
    id: 'mature',
    word: 'mature',
    group: 'sound',
    spellingSyllables: ['ma', 'ture'],
    respelling: 'muh-TYOOR',
    ipa: '/məˈtʃʊə/',
    hint: 'Stress the second syllable.',
    commonErrors: [
      {
        heardLike: ['matured', 'mature e', 'metre'],
        syllableIndex: 1,
        note: 'muh-TYOOR, rhyming with "sure".',
      },
    ],
  },
]

export const PRACTICE_WORD_IDS = PRACTICE_WORDS.map((w) => w.id)

/** Fast lookup for the API's validation and the page's routing. */
export function findPracticeWord(id: string): PracticeWord | undefined {
  return PRACTICE_WORDS.find((w) => w.id === id)
}

// ---------------------------------------------------------------------------
// Judging
// ---------------------------------------------------------------------------

/**
 * Everything reduced to lowercase letters with spaces removed, so "Veggie
 * table", "veggie-table" and "veggietable" all compare equal. Removing spaces
 * matters more than it looks: a recogniser hearing an extra syllable frequently
 * splits the word in two, and that is a pronunciation error, not two words.
 */
export function normalisePronunciation(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, '')
}

/**
 * The same, but word boundaries survive as single spaces: "Veggie-table" and
 * "veggie  table" both become "veggie table", while "veggietable" stays one
 * token.
 *
 * Both normalisers exist because a boundary is evidence. Whether the engine
 * returned one word or two is the single most useful thing it tells us — a
 * recogniser hearing an extra syllable in "island" reports "is land" — so the
 * comparison that decides *what went wrong* has to keep the space, while the
 * comparison that decides *which letters were heard* has to ignore it.
 */
export function normaliseSpoken(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .trim()
}

const VOWELS = 'aeiouy'

/**
 * Crude orthographic syllable split, for words typed in by the student that are
 * not in the bank. Breaks before a consonant that starts a new vowel group.
 *
 * Deliberately not clever: it only decides where a highlight lands on the
 * free-text path, which the UI already labels as the coarser one. Bank words
 * carry hand-checked splits instead.
 */
export function splitSyllables(word: string): string[] {
  const lower = word.toLowerCase()
  if (lower.length <= 3) return [word]

  const out: string[] = []
  let start = 0
  let seenVowel = false

  for (let i = 0; i < lower.length; i++) {
    const char = lower[i]
    if (char === undefined) continue

    if (VOWELS.includes(char)) {
      seenVowel = true
      continue
    }

    const next = lower[i + 1]
    if (seenVowel && next !== undefined && VOWELS.includes(next) && i > start) {
      out.push(word.slice(start, i))
      start = i
      seenVowel = false
    }
  }

  const tail = word.slice(start)
  if (tail) {
    const tailHasVowel = [...tail.toLowerCase()].some((c) => VOWELS.includes(c))
    const last = out.length - 1
    // A trailing chunk with no vowel is not a syllable — glue it to the one before.
    if (!tailHasVowel && last >= 0) out[last] = `${out[last]}${tail}`
    else out.push(tail)
  }

  return out.length > 0 ? out : [word]
}

/** Plain Levenshtein. Only used to decide "is this even the same word". */
function editDistance(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)

  for (let i = 1; i <= a.length; i++) {
    const row = [i, ...Array.from({ length: b.length }, () => 0)]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min((row[j - 1] ?? 0) + 1, (prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + cost)
    }
    prev = row
  }

  return prev[b.length] ?? 0
}

/**
 * Maps a character offset in the word onto the syllable containing it.
 *
 * Uses the longest common prefix rather than a full alignment backtrace,
 * because the first point of divergence IS the thing worth pointing at, and it
 * lands correctly on the common cases: "pronounciation" diverges from
 * "pronunciation" at index 4, which is inside "nun".
 */
function syllableAt(spellingSyllables: string[], charIndex: number): number {
  let seen = 0
  for (let i = 0; i < spellingSyllables.length; i++) {
    seen += (spellingSyllables[i] ?? '').length
    if (charIndex < seen) return i
  }
  return Math.max(0, spellingSyllables.length - 1)
}

function commonPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length)
  let i = 0
  while (i < max && a[i] === b[i]) i++
  return i
}

export type PronunciationVerdict =
  /** Nothing detectably wrong. NOT the same as "perfect" — see the file header. */
  | { kind: 'clear'; heard: string }
  /** Matched a hand-written diagnosis from the bank. The most useful outcome. */
  | { kind: 'known_error'; heard: string; syllableIndex: number; note: string }
  /** Something was off and we can localise it, but have no written advice. */
  | { kind: 'syllable_off'; heard: string; syllableIndex: number }
  /** Too far from the target to be a pronunciation problem at all. */
  | { kind: 'different_word'; heard: string }
  | { kind: 'no_speech' }

export interface JudgeInput {
  word: string
  spellingSyllables: string[]
  commonErrors?: PracticeError[]
}

/**
 * Pure, engine-agnostic. `alternatives` is whatever the recogniser offered,
 * best first — passing more of them makes a `clear` verdict more likely, which
 * is the correct bias: we would rather miss a subtle error than tell a student
 * they got a word wrong when they did not.
 */
export function judgePronunciation(target: JudgeInput, alternatives: string[]): PronunciationVerdict {
  const wanted = normalisePronunciation(target.word)
  const wantedSpoken = normaliseSpoken(target.word)
  const candidates = alternatives.map((a) => a.trim()).filter((a) => a.length > 0)

  if (candidates.length === 0 || wanted.length === 0) return { kind: 'no_speech' }

  const heard = candidates[0] ?? ''
  const heardNorm = normalisePronunciation(heard)
  const heardSpoken = normaliseSpoken(heard)

  /**
   * Curated errors are checked FIRST, ahead of the exact-match pass, and every
   * comparison here is boundary-preserving. Both details are load-bearing.
   *
   * Order: `commonErrors` are hand-written per word, so a hit is a deliberate
   * statement that this transcription means this error. Nothing generic should
   * overrule it.
   *
   * Boundaries: comparing letters only would make "is land" identical to
   * "island", which breaks this in both directions at once — the exact-match
   * pass would call the mistake `clear`, and this pass would flag a perfectly
   * good reading as the mistake. Keeping the space separates them.
   */
  for (const error of target.commonErrors ?? []) {
    if (error.heardLike.some((h) => normaliseSpoken(h) === heardSpoken)) {
      return {
        kind: 'known_error',
        heard,
        syllableIndex: Math.min(error.syllableIndex, target.spellingSyllables.length - 1),
        note: error.note,
      }
    }
  }

  // Any alternative matching exactly is a pass. The recogniser's own ranking is
  // not reliable enough to insist the match be its first choice.
  if (candidates.some((c) => normaliseSpoken(c) === wantedSpoken)) {
    return { kind: 'clear', heard: candidates[0] ?? target.word }
  }

  /**
   * Right letters, extra boundary: the engine heard every sound of a one-word
   * target but split it in two, which is what an added syllable sounds like to
   * it ("vege table" for vegetable). No curated note covered this exact form,
   * so localise it generically — to the syllable holding the last letter
   * *before* the break, since that is the sound the student put a stop after.
   */
  if (heardNorm === wanted && !wantedSpoken.includes(' ') && heardSpoken.includes(' ')) {
    return {
      kind: 'syllable_off',
      heard,
      syllableIndex: syllableAt(
        target.spellingSyllables,
        Math.max(0, heardSpoken.indexOf(' ') - 1),
      ),
    }
  }

  // Beyond this much difference it is a different word, not a mangled one, and
  // pointing at a syllable would be noise.
  const tolerance = Math.max(2, Math.floor(wanted.length * 0.4))
  if (editDistance(wanted, heardNorm) > tolerance) {
    return { kind: 'different_word', heard }
  }

  return {
    kind: 'syllable_off',
    heard,
    syllableIndex: syllableAt(target.spellingSyllables, commonPrefixLength(wanted, heardNorm)),
  }
}
