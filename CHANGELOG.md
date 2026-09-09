# SkillFlex — build record

Every change, why it was made, and what it touched. Newest first.

This file exists so neither of us has to reconstruct a decision from a diff. Code
says *what*; git says *when*; this says **why**, which is the part that gets lost.

**Conventions used below**
- Dates are IST, `YYYY-MM-DD`.
- "Needs you" means a step I cannot run from here (no `DATABASE_URL` on this
  machine) — it is not optional, it is queued for you.
- Verification claims are only written down once they have actually passed.

---

## Standing constraints

These outrank any feature request, including my own suggestions. If a new feature
collides with one of these, the feature bends.

| # | Constraint | Where it is enforced |
| --- | --- | --- |
| C1 | **No AI scores anyone.** A machine never produces an assessment of a student. | Structurally: `Feedback.rubricScores` is written by a human mentor only; `PronunciationAttempt` has **no score column**. |
| C2 | **AI output is derived, never originated.** | `WeeklyPlan.sourceFeedbackIds` must be non-empty; `buildWeeklyPlan()` returns `null` when no human feedback exists. |
| C3 | **The college never sees student video**, and never sees drill data. | No mentor route and no org route exists over `pronunciation_attempts`. |
| C4 | **Mobile bottom nav is capped at 5 entries.** | `apps/web/src/components/AppShell.tsx:15`. Anything past five lives in the pet widget instead. |
| C5 | **Extra//gamified features live inside the pet widget**, not the core nav. | Your instruction, 2026-09-09. Leaderboard is the one agreed exception. |
| C6 | Schema changes ship as `prisma db push` + a hand-run SQL file. No migration folder. | `packages/db/prisma/*.sql`, following `postgres-hardening.sql`. |

---

## 2026-09-09 — Feature batch assessment (6 requests)

You sent six features and asked me to check what was already built before
building anything. Result:

| # | Request | Status |
| --- | --- | --- |
| 1 | Proper AI features + student grading system | **Not built.** Collides with C1 — needs the reconciliation below. |
| 2 | Level system: Beginner → Intermediate → Experienced (+ "God Mode"?) | **Not built.** Blocked on the top-tier naming decision. |
| 3 | "Words expert" pronunciation training | **Already built** — shipped 2026-09-08, see below. Nothing to do. |
| 4 | Leaderboard for top gainers/scorers | **Not built.** Agreed exception to C5 — treated as a main feature. |
| 5 | Gamified competing page (spelling / pronunciation battle, soft-skill quiz) | **Not built.** |
| 6 | Language learning / foreign language section | **Not built.** |

### The tension in requests 1, 2 and 4, and how it resolves

A "grading system", a "level", and a board of "top scorers" are all assessments of
a student. C1 says a machine never produces one. Both things can be true, but only
with the source of the judgement pinned down, so that is pinned down here before
any code:

- **A level is aggregated *human* judgement, not a machine's.** It is computed
  from `Feedback.rubricScores` — which only a mentor can write — plus effort
  counts. So the level is a *view* over mentor assessments, in the same way a
  weekly plan is a view over mentor feedback. It is honest to call that a grade.
  AI does not get a vote in it.
- **The leaderboard ranks effort, never quality.** Words cleared, day streak,
  assignments submitted, lectures attended — things a student *did*, which are
  facts rather than opinions. It must not rank rubric averages: that would publish
  one student's mentor assessment to another student, and it would turn a
  trust-critical artifact into a competitive score.
- **"AI features" means derivation and drills**, which is what already exists:
  plan restructuring (`rule-based-v1`) and the unscored pronunciation drill.

This keeps the README's headline claim literally true while still giving you the
progression and competition you asked for. Recorded here because it is the kind of
decision that quietly erodes if it only lives in a chat message.

**Still open:** the top-tier name. "God Mode" reads well to a 19-year-old in the
pet widget and reads badly on a NAAC/NBA-facing college dashboard, and the tier
value ends up in an enum, in the database, and in employer-facing views.

---

## 2026-09-09 — Level, leaderboard, battles and languages built out

**Why.** The six-request assessment above concluded each of these was *not built*.
This entry covers the build. The shared types, the `BattleAttempt` model and the
progress/battle API routes existed from the prior session; this window wired the
API layer into them, then built every page they needed, then placed each one in
the pet widget rather than the nav.

**How each request stayed inside the constraints**
- **Level** (`/progress`, `ProgressPage`) — a *derived view*. `deriveLevel()` in
  `packages/shared/src/levels.ts` reads the human rubric average and the effort
  facts and combines them 50/50. Level is never stored and never machine-scored:
  one input is a mentor's own rubric scores, the other is what the student did.
- **Leaderboard** (`/leaderboard`, `LeaderboardPage`) — the one agreed exception
  to C5, so it is a real route. It ranks **effort only**: `leaderboardScore()` in
  `packages/shared/src/progress.ts` sums words cleared, day streak, submissions,
  lectures attended, plan items done and battles won against `EFFORT_CAPS`. The
  page deliberately renders no rubric average and no "quality" number, and the
  note under the board says so. The server never sends one.
- **Battles** (`/battles`, `BattlePage`) — four drills (spelling, pronunciation,
  sentence, quiz) that are *games*, not assessments. Every verdict is objective —
  string/option compare against a fixed answer key — and `BattleAttempt` stores
  `score` / `total` / `durationSeconds`, **facts, not grades**. There is no
  quality column in the model, by design. The pronunciation battle reuses the
  existing unscored drill (`judgePronunciation()` + `useSpeechRecognition`) and
  logs through `/practice/attempts`, not through a battle attempt.
- **Languages** (`/languages`, `LanguagePage`) — a phrasebook over
  `LANGUAGE_COURSES` (es/fr/de/ja/ko). Tapping a phrase reads it aloud with the
  available device TTS voice; that is the whole capability, and the page says
  so. Nothing here is an assessment.

**Added — shared**
- `packages/shared/src/levels.ts`, `packages/shared/src/progress.ts`
  (`leaderboardScore`, `EffortFacts`, `EFFORT_CAPS`),
  `packages/shared/src/battle.ts` (`SPELLING_WORDS`, `SENTENCE_QUESTIONS`,
  `QUIZ_QUESTIONS`), `packages/shared/src/language.ts` (`LANGUAGE_COURSES`),
  `packages/shared/src/voices.ts` (`CHEER_VOICES`, `ENCOURAGE_VOICES`,
  `ROUND_WRAPPERS`, `pickVoice`), and the `recordBattleAttemptSchema` contract.

**Added — api**
- `apps/api/src/modules/progress/service.ts` + `routes.ts` — `loadEffortFacts()`,
  `averageRubricPct()`, `computeLevel()`, `effortScore()`, `streakDays()`,
  `countPlanItemsDone()`. `GET /progress/me` and `GET /progress/leaderboard`.
- `apps/api/src/modules/battles/routes.ts` — `POST /battles/attempts`,
  `GET /battles/summary`.

**Added — db**
- `BattleAttempt` model, `packages/db/prisma/add-battle-attempts.sql`, and a
  battle-attempt block in `packages/db/prisma/seed.ts` keyed off `students[1]!`
  and `students[2]!` (the later-declared `priya`/`aditya` consts cause a TDZ error
  if used here — that exact failure is why the numbered indexes are in).

**Added — web**
- `apps/web/src/features/progress/ProgressPage.tsx`, `LeaderboardPage.tsx`,
  `apps/web/src/features/battles/BattlePage.tsx`,
  `apps/web/src/features/languages/LanguagePage.tsx`.
- `apps/web/src/lib/useSpeechRecognition.ts` — generic `speak()` export for the
  reaction cheers (default `en-IN`) and the language phrasebook (`course.tag`).
- Routes in `apps/web/src/App.tsx`; ten pet-widget entries (all extras live
  there, per C5); four cards on `LearnPage` (`Your level`, `Battle drills`,
  `Top movers`, `Learn a language`).
- `apps/web/src/styles/global.css` — `.you-row` (ring + left accent so the
  current student's leaderboard row reads as selected) and a scroll cap on
  `.pet-actions` so ten rows stay inside the `16rem` bubble.

**Applied this window:** `apps/web/src/styles/global.css` was missing the
`.you-row` class that `LeaderboardPage.tsx` references — added, plus the
`pet-actions` max-height. Verified with `npm run typecheck` (clean across
`db`/`shared`/`api`/`web`). No local DB, so per the standing constraint
verification stops here; there is no dev-server or end-to-end check.

**Needs you:** run `packages/db/prisma/add-battle-attempts.sql` in the Supabase
SQL editor (already-queued from the prior session, and re-queued here because the
seed block is new). Until then `/battles` save operations and the seed will 500.

---

## 2026-09-08 — Pronunciation practice ("words expert")

**Why.** Students recorded a whole assignment and then waited days for a human.
There was no fast loop for the smallest unit of spoken English — one word.

**The constraint problem.** A pronunciation checker *is* a machine evaluating
speech, which runs straight into C1. Reconciled as **a drill, not an assessment**,
and enforced in the schema rather than in copy:
- `PronunciationAttempt` has no score column — its absence is the enforcement.
- It never writes `Feedback`, so it carries no `sourceFeedbackId`, so
  `buildWeeklyPlan()` structurally cannot turn a drill into a plan item.
- It appears in no org report and no mentor route (C3).
- UI says "practice" and "clear" — never "score", "grade" or "level".

**Honest capability ceiling, stated in the UI and not just here.** The browser's
`SpeechRecognition` is word-level, not phoneme-level, and biased toward returning
real dictionary words — so a word said *slightly* wrong often comes back
transcribed correctly. A pass therefore means "we couldn't detect an error",
never "you said it perfectly", and the screen says exactly that. Firefox has never
shipped `SpeechRecognition`, so it gets a real explanatory state, not a blank
panel. Accuracy is localised to the **syllable**, which is both the honest ceiling
of a free engine and the unit a student can actually act on.

**Added**
- `packages/shared/src/pronunciation.ts` — 82 curated words Indian English
  speakers commonly trip on, each with hand-written diagnoses; plus the pure
  `judgePronunciation()` / `splitSyllables()` helpers (pure so they are testable
  and reusable server-side).
- `apps/web/src/features/practice/PracticePage.tsx` — route `/practice`.
- `apps/web/src/lib/useSpeechRecognition.ts` — mirrors `useRecorder`'s state
  union and mic-release discipline on purpose.
- `apps/web/src/types/speech.d.ts` — `SpeechRecognition` is absent from
  TypeScript 5.7's `lib.dom.d.ts`; verified, hence the ambient declaration.
- `apps/api/src/modules/practice/routes.ts` — `POST /attempts`, `GET /summary`.
- `PronunciationAttempt` model + `packages/db/prisma/add-pronunciation-attempts.sql`.

**Design notes worth keeping**
- Judging is client-side because the audio never leaves the browser — we only ever
  receive the text the recogniser produced. That is also why `matched` is trusted
  from the client: we have no audio to recheck it against, and it drives nothing
  but a streak counter.
- Streaks are computed in application code, not SQL, because the day boundary is
  India time. `istDayKey()` uses a fixed `+05:30` (India has one zone and no DST),
  so the same instant resolves identically on an IST laptop and a UTC container.
  A `toDateString()` streak would break at 05:30 IST and credit an early-morning
  practice to the wrong day.
- Silence is not logged as an attempt — otherwise the streak inflates with days
  the student opened the page and said nothing.
- No bottom-nav entry (C4). Reached from the pet menu and a card on `LearnPage`.

**Needs you:** run `packages/db/prisma/add-pronunciation-attempts.sql` in the
Supabase SQL editor. Until then `/practice` will 500 on save.

---

## 2026-09-08 — Pet companion became an activity launcher

**Why.** The pet roamed every signed-in page and did exactly one thing (show the
weekly plan). Meanwhile C4 means the nav is full at five entries, so new features
had nowhere to become discoverable. Making the pet a launcher gives the app a
"what can I do right now?" surface — and is why C5 is workable at all.

**Changed** `apps/web/src/components/PetCompanion.tsx`
- Next live lecture stays **pinned above** the menu: it is the only thing in the
  app that can be *missed*, so time-bound beats not-time-bound.
- The three-item plan preview collapsed to one line (`3 left` / `all done ✓`)
  riding on the "This week's plan" row, which is what freed the space.
- Six student activities / three mentor activities, reusing `AppShell`'s icon
  vocabulary so a row and the tab it leads to read as the same thing.
- Signed-out state unchanged — no menu, just the friendly line.
- Every row closes the bubble on click; bubble is `min(16rem, 100vw - 2.5rem)`,
  so rows are single-line by necessity.

---

## 2026-09-08 — Mentor logins normalised to `@skillflex.in`

**Why.** The demo mentor logins did not work. Commit `e032881` ("Rebrand
SkillSwitch -> SkillFlex") renamed everything in the repo — but **a seed only ever
writes a fresh database**, so a Supabase instance seeded before that commit still
held the old addresses, and no amount of editing `seed.ts` moves them. This was
the actual bug: code and live data had diverged.

**The correction that mattered.** My first version of this SQL targeted
`@mentor.skillflex.in` — the already-corrected seed value — and would have matched
**zero** live rows. You caught it: the live data is `@skillswitch.in`. Rewritten to
target the pre-rebrand domains by regex.

**Added** `packages/db/prisma/rename-mentor-emails.sql` — four statements, run top
to bottom: preview → collision check → update → read back.
- It **rebuilds the domain** rather than replacing a substring, because two things
  were wrong at once (the old brand *and* an accidental `mentor.` subdomain). That
  lands every legacy variant on one canonical form and is idempotent by
  construction: after it runs, nothing matches the `WHERE` any more.
- The collision check is mandatory before the update — `users.email` is `@unique`,
  and the check deliberately includes already-canonical rows so a target address
  that already exists shows up too.
- **Four rows, not three.** `admin@skillswitch.in` is on the old domain as well,
  so the `admin@skillflex.in` login documented in the README did not work either.

**Sessions survive this.** The JWT payload carries an `email` claim, but nothing
resolves a user by it — every authenticated path goes through `sub`, the user id
(`apps/api/src/lib/auth.ts:6`), and `signFor()` re-reads the row by `id`. The claim
just goes stale until the next sign-in, and `/me` re-reads by id, so the UI shows
the new address on the next page load. Verified by grep: zero uses of `auth.email`
in a query.

**Needs you:** paste the file into the Supabase SQL editor, statement by statement.
Expect `UPDATE 4`.
