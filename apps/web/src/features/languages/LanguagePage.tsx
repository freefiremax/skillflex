import { useState } from 'react'
import { LANGUAGE_COURSES } from '@skillflex/shared'
import { speak } from '../../lib/useSpeechRecognition'
import { Card, Pill } from '../../components/ui'

/**
 * A phrasebook, not a course. There is no grammar engine, no spaced-repetition
 * store, and no assessment — the value is hearing a real sentence in a native-ish
 * voice and being able to echo it. The voice is the device's own `speechSynthesis`
 * (the same free, offline engine the drill uses), keyed by a BCP-47 tag.
 */
export default function LanguagePage() {
  const [courseId, setCourseId] = useState<string>(LANGUAGE_COURSES[0]!.id)
  const course = LANGUAGE_COURSES.find((c) => c.id === courseId) ?? LANGUAGE_COURSES[0]!

  return (
    <div className="stack">
      <div>
        <h1>Languages</h1>
        <p className="small">
          Everyday phrases in a spread of languages, each with a romanisation so you can say it even
          if you can’t read the script yet. Tap a phrase to hear it; there’s no test here — just
          practice saying something real.
        </p>
      </div>

      <div className="row wrap">
        {LANGUAGE_COURSES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`btn btn-sm ${course.id === c.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setCourseId(c.id)}
          >
            {c.script}
          </button>
        ))}
      </div>

      <Card>
        <div className="row-between" style={{ marginBottom: '0.2rem' }}>
          <div className="strong">{course.name}</div>
          <Pill tone="brand">{course.script}</Pill>
        </div>
        <div className="tiny faint" style={{ marginBottom: '0.7rem' }}>
          {course.blurb}
        </div>

        {course.groups.map((g) => (
          <div key={g.label} className="stack-sm" style={{ marginBottom: '0.8rem' }}>
            <div className="tiny faint" style={{ margin: '0.5rem 0 0.3rem' }}>
              {g.label.toUpperCase()}
            </div>
            {g.phrases.map((p) => (
              <button
                key={p.text}
                type="button"
                className="card card-tight card-interactive"
                style={{ textAlign: 'left', width: '100%' }}
                onClick={() => speak(p.text, course.tag)}
              >
                <div className="row-between">
                  <div>
                    <div className="strong">{p.text}</div>
                    <div className="tiny faint">{p.roman}</div>
                  </div>
                  <div className="row" style={{ flex: '0 0 auto' }}>
                    <Pill>{p.meaning}</Pill>
                    <span className="tiny faint">♪</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ))}
      </Card>

      <div className="ai-note tiny dim">
        The pronunciation model is your device’s own built-in voice — no API key, no network, and no
        one listening. If a phrase sounds flat, a native human is still the best teacher.
      </div>
    </div>
  )
}
