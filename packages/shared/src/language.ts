/**
 * Language learning — a phrasebook, not a course.
 *
 * This is a curated set of everyday phrases across a spread of foreign
 * languages, grouped by use ("greetings", "self-intro", "travel basics"). It is
 * DELIBERATELY content-only: no grammar engine, no spaced-repetition store, no
 * assessment. The value is hearing a real sentence and being able to echo it,
 * and the pronunciation model is the device's own `speechSynthesis` voice — the
 * same free offline speech the drill already uses, no API key, no network.
 *
 * The `tag` is the BCP-47 speech-synthesis language code. It is what makes the
 * device pick a native-ish voice; the phrase text itself never assumes a
 * particular recogniser.
 */

export interface LanguageCourse {
  /** Stable id used in links and the data-science-free UI. */
  id: string
  /** Human face in English. */
  name: string
  /** Written in its own script for the "this is what it looks like" moment. */
  script: string
  /** BCP-47 code for speechSynthesis. */
  tag: string
  /** A one-line subtitle for the course card. */
  blurb: string
  groups: {
    label: string
    phrases: { text: string; roman: string; meaning: string }[]
  }[]
}

export const LANGUAGE_COURSES: LanguageCourse[] = [
  {
    id: 'es',
    name: 'Spanish',
    script: 'Español',
    tag: 'es-ES',
    blurb: 'The easiest foreign language for an English speaker — spelling is phonetic.',
    groups: [
      {
        label: 'Greetings',
        phrases: [
          { text: 'Hola', roman: 'OH-la', meaning: 'Hello' },
          { text: 'Buenos días', roman: 'BWEH-nos DEE-as', meaning: 'Good morning' },
          { text: '¿Cómo estás?', roman: 'KO-mo es-TAS', meaning: 'How are you?' },
          { text: 'Gracias', roman: 'GRA-thyas', meaning: 'Thank you' },
          { text: 'Adiós', roman: 'a-DYOS', meaning: 'Goodbye' },
        ],
      },
      {
        label: 'Self-intro',
        phrases: [
          { text: 'Me llamo Adwait', roman: 'me YA-mo Adwait', meaning: 'My name is Adwait' },
          { text: 'Soy estudiante', roman: 'soy es-tu-DYAN-te', meaning: 'I am a student' },
          { text: 'Estoy aprendiendo español', roman: 'es-TOY a-pren-DYEN-do es-pa-NYOL', meaning: 'I am learning Spanish' },
        ],
      },
      {
        label: 'Basics',
        phrases: [
          { text: 'No entiendo', roman: 'no en-TYEN-do', meaning: 'I don’t understand' },
          { text: '¿Dónde está el baño?', roman: 'DON-de es-TA el BA-nyo', meaning: 'Where is the toilet?' },
          { text: 'Cuánto cuesta?', roman: 'KWAN-to KWES-ta', meaning: 'How much does it cost?' },
        ],
      },
    ],
  },
  {
    id: 'fr',
    name: 'French',
    script: 'Français',
    tag: 'fr-FR',
    blurb: 'The language of courtesy — and the one whose spelling lies the most.',
    groups: [
      {
        label: 'Greetings',
        phrases: [
          { text: 'Bonjour', roman: 'bon-ZHOOR', meaning: 'Hello / Good day' },
          { text: 'Merci beaucoup', roman: 'mer-SEE bo-KOO', meaning: 'Thank you very much' },
          { text: 'Au revoir', roman: 'o ruh-VWAHR', meaning: 'Goodbye' },
          { text: 'Comment ça va?', roman: 'ko-MON sa va', meaning: 'How are you?' },
        ],
      },
      {
        label: 'Self-intro',
        phrases: [
          { text: 'Je m’appelle Adwait', roman: 'zhuh ma-PEL Adwait', meaning: 'My name is Adwait' },
          { text: 'Je suis étudiant', roman: 'zhuh swee e-tu-DYAN', meaning: 'I am a student' },
          { text: 'Je parle un peu français', roman: 'zhuh parl uh puh fron-SAY', meaning: 'I speak a little French' },
        ],
      },
      {
        label: 'Basics',
        phrases: [
          { text: 'Je ne comprends pas', roman: 'zhuh nuh kom-PRON pa', meaning: 'I don’t understand' },
          { text: 'Où sont les toilettes?', roman: 'oo son lay twa-LET', meaning: 'Where are the toilets?' },
          { text: 'Combien ça coûte?', roman: 'kom-BYEN sa koot', meaning: 'How much is it?' },
        ],
      },
    ],
  },
  {
    id: 'de',
    name: 'German',
    script: 'Deutsch',
    tag: 'de-DE',
    blurb: 'The great compounder — long words, honest pronunciation.',
    groups: [
      {
        label: 'Greetings',
        phrases: [
          { text: 'Hallo', roman: 'HAH-lo', meaning: 'Hello' },
          { text: 'Guten Morgen', roman: 'GOO-ten MOR-gen', meaning: 'Good morning' },
          { text: 'Danke schön', roman: 'DAN-ke SHURN', meaning: 'Thank you' },
          { text: 'Auf Wiedersehen', roman: 'owf VEE-der-zayn', meaning: 'Goodbye' },
        ],
      },
      {
        label: 'Self-intro',
        phrases: [
          { text: 'Ich heiße Adwait', roman: 'ish HYE-seh Adwait', meaning: 'My name is Adwait' },
          { text: 'Ich bin Student', roman: 'ish bin shtu-DENT', meaning: 'I am a student' },
          { text: 'Ich lerne Deutsch', roman: 'ish LAIR-ne doych', meaning: 'I am learning German' },
        ],
      },
      {
        label: 'Basics',
        phrases: [
          { text: 'Ich verstehe nicht', roman: 'ish fair-SHTAY-eh nisht', meaning: 'I don’t understand' },
          { text: 'Wo ist die Toilette?', roman: 'vo ist dee to-ya-LET-teh', meaning: 'Where is the toilet?' },
          { text: 'Wie viel kostet das?', roman: 'vee feel KOS-tet das', meaning: 'How much is this?' },
        ],
      },
    ],
  },
  {
    id: 'ja',
    name: 'Japanese',
    script: '日本語',
    tag: 'ja-JP',
    blurb: 'Three scripts, zero gender, and no conjugating around who’s talking.',
    groups: [
      {
        label: 'Greetings',
        phrases: [
          { text: 'こんにちは', roman: 'KON-ni-chi-wa', meaning: 'Hello / Good afternoon' },
          { text: 'ありがとう', roman: 'a-ri-ga-TOU', meaning: 'Thank you' },
          { text: 'さようなら', roman: 'sa-YO-na-ra', meaning: 'Goodbye' },
          { text: 'おはよう', roman: 'o-ha-YOU', meaning: 'Good morning' },
        ],
      },
      {
        label: 'Self-intro',
        phrases: [
          { text: '私はアスウィットです', roman: 'wa-ta-shi wa Adwait desu', meaning: 'I am Adwait' },
          { text: '学生です', roman: 'ga-ku-sei desu', meaning: 'I am a student' },
          { text: '日本語を勉強しています', roman: 'ni-hon-go o ben-kyou shi-te-i-masu', meaning: 'I am studying Japanese' },
        ],
      },
      {
        label: 'Basics',
        phrases: [
          { text: 'わかりません', roman: 'wa-ka-ri-ma-sen', meaning: 'I don’t understand' },
          { text: 'トイレはどこですか?', roman: 'to-i-re wa do-ko desu ka', meaning: 'Where is the toilet?' },
          { text: 'いくらですか?', roman: 'i-ku-ra desu ka', meaning: 'How much is it?' },
        ],
      },
    ],
  },
  {
    id: 'ko',
    name: 'Korean',
    script: '한국어',
    tag: 'ko-KR',
    blurb: 'Hangul is a font of letters you can sound out — no memorising thousands.',
    groups: [
      {
        label: 'Greetings',
        phrases: [
          { text: '안녕하세요', roman: 'an-nyeong-ha-se-yo', meaning: 'Hello' },
          { text: '감사합니다', roman: 'gam-sa-ham-ni-da', meaning: 'Thank you' },
          { text: '안녕히 가세요', roman: 'an-nyeong-hi ga-se-yo', meaning: 'Goodbye' },
        ],
      },
      {
        label: 'Self-intro',
        phrases: [
          { text: '제 이름은 아드와이입니다', roman: 'je i-reum-eun Adwait-ip-ni-da', meaning: 'My name is Adwait' },
          { text: '학생입니다', roman: 'hak-saeng-ip-ni-da', meaning: 'I am a student' },
          { text: '한국어를 공부하고 있어요', roman: 'han-guk-eo-reul gong-bu-ha-go i-sseo-yo', meaning: 'I am studying Korean' },
        ],
      },
      {
        label: 'Basics',
        phrases: [
          { text: '못 알아들었어요', roman: 'mot a-ra-deu-reo-sseo-yo', meaning: 'I didn’t understand' },
          { text: '화장실이 어디예요?', roman: 'hwa-jang-sil-i eo-di-ye-yo', meaning: 'Where is the toilet?' },
          { text: '얼마예요?', roman: 'eol-ma-ye-yo', meaning: 'How much is it?' },
        ],
      },
    ],
  },
]
