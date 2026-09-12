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
| C4 | **Mobile bottom nav is capped at 5 entries.** | `apps/web/src/components/AppShell.tsx:16`. Anything past five is reached from Home or the buddy screen instead. |
| C5 | **Extra/gamified features stay out of the core nav.** | Your instruction, 2026-09-09. Reached *through* the buddy — `/pet` is the only entry to Fun Time. Leaderboard is the one agreed exception. Wording relaxed 2026-09-12: the games became routes rather than widget contents, but they stayed off the nav. |
| C6 | Schema changes ship as `prisma db push` + a hand-run SQL file. No migration folder. | `packages/db/prisma/*.sql`, following `postgres-hardening.sql`. |

---

## 2026-09-13 — The buddy's two doors are the owl's; Home tells you how

**Why.** Two problems on the first two screens a new student sees.

`/pet` had the right structure — exactly two doors — but only one of them was the
owl's colour. `--fun-*` (`#d6830c → #fcc539`) came off the bird's beak.
`--support-*` (`#0a6880 → #2a9ec4`) was derived from `--accent`, and **there is no
teal anywhere in `angry-owl.svg`**: counting every fill in the file gives browns,
tans, cream, gold and one bright yellow. So the pair read as two unrelated
buttons that happened to share a page with a bird.

Home, meanwhile, sold instead of instructing. Eleven flat doors whose copy
answered *why* to tap them — "It never ranks quality", "No AI computes it",
"Switching costs you none of your history" — all true, and none of it any use to
someone who has just signed in. Nothing was ordered, so the one sequence that
matters (watch → record → read → plan) looked like four unrelated places among
eleven.

**The tiles.** Every value is now a hex that actually appears in the drawing. Fun
Time keeps the beak gold and switches its ink to `#442217`, the owl's own darkest
outline; AI Support becomes `#442217 → #73350f` — outline into deep plumage —
with `--mascot-cream` ink. `#73350f → #b68556` was the prettier plumage ramp and
was rejected: cream on `#b68556` is ≈2.6:1.

That fixed a live accessibility defect as a side effect. `.tile-xl` hardcoded
`color: #fff`, and white on `#d6830c` is ≈2.9:1 — under the 4.5:1 floor, and it
had been shipping. Brown on the gold is ≈4.8:1 rising to ≈8.9:1 across the
gradient; cream on the plumage runs ≈13:1 down to ≈8.6:1. The `opacity: 0.92` and
`0.95` on `.tile-xl-blurb` / `.tile-xl-cta` are gone with it — fading the brown
ink pulled 4.8:1 back down to about 4.4:1, and size and weight were already
carrying that hierarchy on their own.

`color: #fff` became `var(--tile-ink, #fff)` in **both** the base rule and the
`:hover, :focus-visible` block. The second one is not cosmetic: these are
anchors, so the global `a:hover` (0,1,1) outranks `.tile-xl` (0,1,0), and
changing one without the other would leave the ink reverting on one state only.

**The owl is now on both tiles**, as a `::after` watermark — two crops of one
drawing, Fun Time's hanging off the corner at 0.16, AI Support's seated and inset
at 0.3. It is referenced through `background-image` deliberately: an SVG loaded
that way renders in secure static mode, where SMIL does not run. This file
carries 22 `repeatCount="indefinite"` animations, so as an `<object>` it would be
22 live timelines per tile; here it costs nothing and needs no
`prefers-reduced-motion` handling. `.tile-xl > *` takes `z-index: 1`, because a
positioned pseudo-element with `z-index: 0` paints *above* non-positioned in-flow
content and the bird would otherwise cover the copy.

`PetPage.tsx` is untouched. The whole pet change is CSS.

**Home is a four-step guide.** The four loop doors became four numbered steps;
the other seven dropped to two compact cards (Live, Your buddy) and a five-chip
row. Numbering is earned here — watch → record → read → plan genuinely is a
sequence, which is the one case where numbered markers carry information instead
of decorating. The number is not `aria-hidden`: it *is* the information, so a
screen reader should hear "1 Watch a lesson".

Every line is now mechanical, and two accuracy constraints shaped the copy.
Steps 1, 3 and 4 name real bottom-nav tabs; **step 2 deliberately does not**,
because `/assignments` has no tab and sending a new user hunting for one would be
worse than no instruction at all — it says "tap this step". And "Record my
answer" is quoted exactly as `AssignmentsPage` renders it; an instruction that
paraphrases a button stops being an instruction.

Nothing is lost by dropping the trust copy. `/progress` says "No AI computes it"
in its own header and `/mentor` says switching is free on its own screen. A claim
belongs where it is acted on. The eleven tracked-out eyebrows (`THIS WEEK`,
`WATCH`, `FROM A PERSON` …) went with them.

The guide shows for everyone, always. A Home that changes shape once you stop
being new is a Home you have to learn twice.

**Two smaller things.** `.door-badge` got `display: inline-block` +
`white-space: nowrap` — "1 ready" was breaking across the step title's line wrap
and splitting its own pill background in half. And Home's chip row uses a new
`.link-row-lg`, which raises `.link-chip` to a 44px minimum inside it: 26px is
fine for a chip sitting beside three others in a card you already meant to act
on, but not as the only route to five pages. The three existing `.link-chip`
users are untouched.

**Verified.** `npm run typecheck` clean across all four workspaces; `npm run build
-w @skillflex/web` clean (133 modules, 435.02 kB JS / 23.90 kB CSS). Then in a
browser, against a stub API on `:4000` behind the Vite proxy driving the real
unmodified client:

On `/pet` — computed `color` on the title, blurb and CTA of each tile is
`rgb(68, 34, 23)` and `rgb(253, 244, 230)` respectively, which is the check that
catches a `--tile-ink` silently falling through to the `#fff` fallback (a
screenshot would not show that on the dark tile); computed `opacity` on both
blurbs and CTAs is `1`; both `::after` rules resolve to `angry-owl.svg`; the
`.tile-xl:hover, .tile-xl:focus-visible` rule reads back from the CSSOM as
`var(--tile-ink, #fff)` with `text-decoration: none`, and focusing each tile
leaves the ink unchanged rather than repainting it brand purple. The owl is one
full transfer plus two ~300-byte revalidations in dev, shared with the
`<object>` MascotGuide already mounts.

On `/` — the four steps render 1–4 in order and all six cards navigate to the
route they name (`/lessons`, `/assignments`, `/feedback`, `/plan`, `/live`,
`/pet`); all five chips point at real routes; step 2 carries the accent ring and
"2 waiting" while tasks are pending, step 3 carries "1 ready". A regex sweep of
`main.innerText` for the old why-copy (`never ranks`, `No AI computes`, `costs
you none`) and for references to tabs that do not exist returned empty. At 320px
both pages have zero horizontal overflow and every chip measures exactly 44px;
the two tiles hold at 288×214, and side by side at desktop (412×193 each) they
read as one bird's two doors. The owl's own line on `/` now says "Four steps, in
order. Start at one — I'll be here."

**Not verified.** The stub invented every row. The task counts that drive the two
badges, the plan progress and the next-lecture line on `/pet` come from
`/curriculum/my-week`, `/plans/current` and `/live/next`, and those still need a
real database — `DATABASE_URL` is the `<project-ref>` placeholder. What the
browser pass proves is that the client renders and behaves correctly against the
shapes those endpoints return.

---

## 2026-09-13 — `/` is Home, not "Learn"; Lessons gets the tab

**Why.** Signing in landed you on `/`, and the bottom bar called that tab
**Learn** while the page rendered eleven nav cards. So the app claimed you were in
a lesson index that was full of unrelated doors, and `/lessons` — a real lesson
index with a "← Home" link at the top — read as a second, competing home screen.
You reported it as "after login it's redirecting to learn page"; the redirect was
never the problem, the label was.

**Home.** `features/learn/LearnPage.tsx` → `features/home/HomePage.tsx`. The
component rendered Home and was named for a different page, which is how the bar
came to be labelled Learn in the first place. Content unchanged — same eleven
doors, same single `['my-week']` query for the "2 waiting" badge. Nav entry is now
`⌂ Home`.

**Lessons is the Learn tab.** Promoted into the bottom bar as `▶ Lessons`, which
is what "Learn" was always pointing at. The bar stays at five (C4): **Mentor gave
up the slot.** It is one tap from Home, named on every feedback card, and visited
roughly once — when you switch mentors — whereas lectures are the thing you come
back for. Its `/mentor` and `/mentor/browse` routes are untouched.

**Lectures only, as asked.** `LessonsPage` no longer mentions assignments
anywhere: the per-lesson `· 2 task` badge is gone, and the intro no longer says
"then record your answer". It also dropped its own "← Home" back link, which was
there because it used to be reachable only from Home and is now redundant chrome
on a top-level tab.

That removed the last consumer of `assignmentCount`, so `GET /curriculum/tracks`
stopped computing it — **which let the `assignments` include come off the query
entirely**, dropping a join across every lesson in the curriculum tree. The
endpoint no longer ships homework data to a screen that must not display it.

The task attached to a lesson still appears when you open that lesson, and the
week's worth still lives on `/assignments`. Only the watch *list* is quiet — the
Video ↔ Assignment ↔ Feedback cross-links on `/lessons/:id` are exactly as they
were, since removing those would undo the "no page is a dead end" requirement.
The owl's `/lessons` line changed to match ("Lectures, module by module. Watch one
all the way through" — it was "then record your answer"); one entry covers both
the list and the detail page, so it had to be true of both.

**Verified.** `npm run typecheck` clean across all four workspaces. Browser pass
against the same throwaway `:4000` stub as yesterday: login lands on `/` with
**Home** as the active tab, five tabs total, and Lessons one tap away. `/lessons`
shows seven lecture cards carrying only title, duration and language — a regex
sweep of the rendered page text for `task|assignment|record` returns nothing — with
no back link and the new owl line. At 320px both pages have zero horizontal
overflow and all five tabs render at 64×67px with "Feedback" unclipped, above the
44px floor the mobile pass set.

---

## 2026-09-12 — Pet screen becomes a hub; owl mascot; AI Support; no more dead ends

**Why.** The pet was the app's only floating affordance and it did one thing: tap
the cat, read this week's plan. Meanwhile Home had become the dumping ground —
greeting, mentor card, next lecture, this week's assignments, six nav cards and
the entire lessons tree in one scroll — and the four games were buried two taps
inside one of those cards. You asked for a hub-and-spoke: Home is doors only, the
pet screen is two doors, and a mascot explains every screen it lands on.

**Mostly assembly, not new code.** All four games already existed inside
`features/battles/BattlePage.tsx` (644 lines) with their word and question banks
in `packages/shared`, and `recordBattleAttemptSchema` already accepted every mode
they log. Fun Time is an extraction into routes; the leaderboard's `battlesWon`
never noticed the move.

**Fun Time** (`features/funtime/`, new). Four games, each its own route rather
than a mode on one page — `/fun-time/{spell,sentence,speak,quiz}`. That is the
whole point of the change: a round is linkable, holds its own score, and survives
a reload. Shared parts (`react()`, `RoundHeader`, `VerdictChip`, `useLogBattle`,
`BattleSummaryStats`, and a new `RoundDone` that de-duplicates four near-identical
end-of-round cards) live in `GameBits.tsx`, following the `features/live/LiveBits.tsx`
convention already in the repo. `/battles` is now `<Navigate to="/fun-time" replace />`
because the old path is in the wild.

`SpeakGamePage` keeps the engine seam intact: it reads only the state union
(`idle | listening | done | denied | unsupported`) and the `alternatives` array
from `useSpeechRecognition`, so swapping the browser's Web Speech API for a
server-side recogniser is a change to that one hook and nothing in the UI. It is
also the one game with no round timer — unlike the other three it logs a row per
word to `/practice/attempts` as it goes, never a round with a duration.

**AI Support** (`/ai-support`, `apps/api/src/modules/support/`). A real LLM chat
scoped hard to the app itself: bugs, permissions, logins, missing feedback,
finding a page. Groq by default via its OpenAI-compatible `/chat/completions`,
called with plain `fetch` and an `AbortSignal.timeout(20_000)` — no SDK, because
the Vercel bundle is a single function and every dependency is weight. Behind a
`SupportEngine` interface with a deterministic keyword fallback, so the page works
with no key set (and is testable here, where the database is unreachable).

The scope wall is structural, not just prompt copy: **the route hands the engine
that user's own `support_messages` rows and a static app blurb, and nothing else.**
No feedback, no recording, no plan, no rubric. Asked "how good is my English?"
the fallback declines and points at the mentor — verified by running the engine
directly. That keeps C1 true in the second place a machine writes text a student
reads, the drill being the first.

New `SupportMessage` model + `packages/db/prisma/add-support-messages.sql`, per C6.
Both writes are wrapped so a missing table (P2021) degrades to "chat answers,
nothing persisted" with a server warning rather than 500ing the page.

**The owl** (`components/MascotGuide.tsx`, replacing `PetCompanion.tsx`). One
buddy, fixed bottom-right, 72px, with a per-page line from a 21-entry map matched
longest-prefix so `/fun-time/spell` gets game copy and falls back to the Fun Time
line. The cat's roaming loop is gone — a mascot that wanders across its own
tooltip is not a guide — and the plan/next-lecture content it used to carry moved
onto `/pet` so nothing was lost.

Rendered through `<object>` rather than `<img>` for one reason: the file carries
22 `repeatCount="indefinite"` SMIL animations, and `pauseAnimations()` on the
embedded document is the only way to honour `prefers-reduced-motion` without
inlining 288 KB into the bundle or shipping a second static asset. Wrapped in
try/catch so a throw cannot take the shell down. `lottie-web` is declared and
`initLottie()` is written but commented out, pointing at
`/assets/lottie/angry-owl.json`; because that import is dynamic and unreachable,
Rollup leaves the library out of the bundle entirely.

**Home is doors only** (`LearnPage.tsx`). Eleven cards, nothing else but the
greeting and two badges. The tree and "This week" moved verbatim into new
`/lessons` and `/assignments` routes, keeping their existing query keys so the
cache is shared rather than duplicated.

**No page is a dead end any more.** Video ↔ Assignment ↔ Feedback each link to
the other two. Two small API additions carried it — `mySubmission` on lesson
assignments, `assignmentId` + `lesson` on `/feedback/mine`; the relations already
existed. The lesson's "See feedback" passes `?item=<id>` so `FeedbackListPage`
scrolls to and outlines that exact card, rather than dropping you on a list of
every review you have ever had, which is the same dead end one page later.

**On C5.** The games are routes now, not widget contents, which is a literal
departure. The spirit holds: they are still reached *through* the buddy — `/pet`
is the only entry — and the bottom nav is still five entries. The constraint was
about keeping gamification out of the core nav, and it is out of the core nav.

**One prerequisite bug, fixed.** `scrubPlaceholders()` in `apps/api/src/lib/env.ts`
skipped empty values, so a variable that was *present but blank* bypassed
`.optional()` and zod rejected it — which is why the API refused to boot with
`SUPABASE_URL=` in `.env`. It now deletes blank keys instead of skipping them.
This had to land first: the three new `SUPPORT_LLM_*` vars ship blank in
`.env.example`, and would have made the boot failure worse.

**Tokens** (`global.css`). The eight `--pet-*` cat-drawing tokens are retired
along with every rule that only the cat SVG used. New accents drawn from the
owl's own palette so they harmonise with the existing `--cta-from: #c19b1a`:
`--fun-*`, `--support-*`, four `--game-*` tones, `--mascot-*`, `--chat-*`. No
one-off hex values in components. `.game-tile` drives its rail from a `--rail`
custom property so four tiles read as four things rather than one thing repeated.

**Verified.** `npm run typecheck` clean across all four workspaces;
`npm run build -w @skillflex/web` succeeds (133 modules, 22.97 kB CSS / 435.08 kB
JS, gzipped to 5.65 / 126.68 kB) with the owl present in `dist/` and `lottie-web`
correctly absent from the bundle — it is declared and commented out, so it costs
nothing until the JSON exists. `npm run build:api` succeeds at 166.3 kb;
`npx prisma validate` passes with the new model; `app.printRoutes()` on the built
bundle confirms `/api/support/history (GET, HEAD)` and `/api/support/chat (POST)`
registered. `lottie-web` was missing from the lockfile after the `package.json`
edit; caught by grepping the lockfile, fixed with `npm install` (resolved 5.13.0).

**Then a browser pass, against a stub API.** Vite already proxies `/api` to
`:4000`, so a throwaway `node:http` server on that port — importing the *real*
`supportEngine`, faking only the database — let the unmodified web client be
driven end to end. Worth the setup: two bugs came out of it that no typecheck
would have caught.

All four games played to a scored round with a deliberate wrong answer in each:
Spell Check 15/16, Sentence Quiz 9/10, Soft-skills Quiz 9/10, Pronunciation 3/5.
Three `battles/attempts` rows and five `practice/attempts` rows arrived, the
practice rows carrying `matched` and `heard` and no score field, which is C1
visible in the wire format. Pronunciation was exercised by replacing
`window.SpeechRecognition` with a fake constructor — legitimate because
`useSpeechRecognition` resolves the constructor inside `start()`, so the hook's
state machine, `judgePronunciation` and the logging call were all the real ones,
with only the transcription source swapped. That covered four verdict kinds, and
confirmed a `no_speech` turn logs nothing at all. Each game then survived a hard
reload on its own URL, which is the claim the route-per-game split exists to make.
AI Support answered through the real engine and rehydrated its thread from
`/support/history` after a reload. The cross-link loop closed in both directions —
`/lessons/ls-1` → `/feedback?item=fb-1` (gold `.card-focused` ring on the named
card) → `/assignments/as-2/record` → back to the lesson — and the assignment with
no review correctly showed no feedback link rather than a dangling one. At 320px,
nine routes with zero horizontal overflow and the owl clear of the bottom nav.

**Two bugs, both fixed.** The support engine's scope wall was unreachable for the
question most likely to hit it. `RULES` is first-match-wins and the "how good is
my English" rule sat eighth, below a rule keyed on `recording`/`upload`/`camera` —
so *"how good is my English, based on my recordings"* got camera troubleshooting.
The one question this bot must decline looked instead like a question it had
missed. The rule moved to first position and gained `how am i doing`; scope now
beats topic, and the ordering is commented so it stays that way. This is the rule
both the README and `docs/data-model.md` point at, so it being reachable only by
accident was worse than a wrong answer.

Second, four newer link-styled classes were losing to the global `a:hover`. It is
`color: var(--brand-deep); text-decoration: underline` at specificity (0,1,1),
and `.tile-xl`, `.game-tile`, `.back-link` and `.link-chip` are all anchors
matched by a single class (0,1,0) — so hovering the Fun Time tile repainted its
white-on-gradient label brand purple and underlined it. `.nav-item:hover` has
restated `text-decoration: none` for this exact reason since the redesign; the
same restatement was added to the four that lacked it. Found in a 320px
screenshot, then confirmed by cloning every `:hover` rule out of
`document.styleSheets` with `:hover` rewritten to a class — there is no way to
park a cursor from a script — and toggling it.

**Needs you.** `npm run db:push`, then paste `add-support-messages.sql` into the
Supabase SQL editor. The two still-unrun files from earlier —
`add-pronunciation-attempts.sql` and `add-battle-attempts.sql` — are what
currently make `/progress` and the games 500, worth running in the same pass. Set
`SUPPORT_LLM_API_KEY` from console.groq.com to move the chat off the fallback.
The browser pass above proved the client behaves correctly against the *shapes*
these endpoints return, but the stub invented the rows. Support persistence, the
two new response fields, and the cross-links are still unverified against a real
database.

---

## 2026-09-10 — Glassmorphism redesign, then a mobile pass over it

**Why.** You asked for the reference image's look: warm sage-cream gradient,
frosted glass cards, a gold-to-teal CTA. The old system was neumorphic — surfaces
the same colour as the page, depth carried entirely by paired emboss shadows.
That is the opposite construction, so this was a token-level replacement rather
than a re-skin.

**The redesign** (`apps/web/src/styles/global.css`)
- All five `--neu-*` shadow pairs deleted. Depth now comes from translucency plus
  one soft shadow (`--shadow` / `--shadow-lift` / `--shadow-glow`).
- Surfaces became `rgba(255,255,255,α)` over a fixed `145deg` sage→cream gradient
  on `body`. Every surface keeps a 1px rgba border, for the same daylight and
  low-vision reason the neumorphic rules had one.
- New `--cta-from: #c19b1a` / `--cta-to: #0f7a6a` pair drives the primary button,
  the active nav pill, the meter fill, the pet action icons and the `.you-row`
  accent bar, so "the thing to press" is one colour story across the app.
- `AppShell.tsx` gained `.brand-flex` so the wordmark's second half can carry the
  gradient; `index.html` added Nunito to the font request.

**The repair that came out of it.** The first pass renamed classes the JSX was
already using — `.video-frame` → `.video-wrap`, `.human-note` → `.mentor-note`,
`.auth-shell` → `.auth-card`, `.mic-btn` → `.btn-mic`, and `.alert-error` →
`.alert-danger` (which `Alert` never emits — it builds `alert-${tone}` from
`info|error|ok|warn`). It also dropped `.empty` / `.empty-icon` entirely and left
`.skeleton` with no height, which collapses every loading state to nothing since
`Loading` renders empty divs. All restored, then verified by diffing every class
referenced in `apps/web/src/**/*.tsx` against every class defined in the
stylesheet — the only remaining "miss" is the `alert-` template-literal stem.

**The mobile pass.** Measured in a 320/360/375px viewport against the real
stylesheet rather than guessed:
- `.shell` used `min-height: 100vh`. Mobile browsers count their collapsing
  address bar in `vh`, so every page carried a phantom scroll — now `100dvh`
  with a `vh` fallback. `.auth-shell` already did this; `.shell` had been missed.
- Header controls were 36px (language `<select>`), 38px (Exit) and ~28px (the
  account pill) — all under the 44px thumb minimum, on the one row that is
  touched most. All three now clear 44px on phones and keep their old desktop
  sizes. The select's inline style moved into `.lang-select`.
- `.tabs` had no overflow guard. Three tabs fit 320px today, but a fourth or a
  longer label would have pushed the last one off-screen unreachably; it now
  scrolls sideways with the scrollbar hidden.
- `.card` blur dropped from 18px to 12px under 860px. `backdrop-filter` is the
  most expensive thing the compositor does and `.card` is the most repeated
  element; blur cost scales with radius, and the stated primary user is on a
  mid-range Android.
- `.grid-2` was two columns at every width — two 170px columns on a 375px screen
  is narrower than the content ever wants. Single column until the breakpoint.
- Topbar now truncates the account pill rather than overflowing, and `.word-plate`
  uses `clamp(1.5rem, 8vw, 2.1rem)` so a long word stays on a 360px screen.

**Verified.** `npm run typecheck` clean across `db`/`shared`/`api`/`web`;
`npm run build -w @skillflex/web` succeeds. In-browser at 320 / 360 / 375px: no
horizontal scroll at any width, header fits without overflow, touch targets
measured at 44/44/46px, `.skeleton` renders at 64px. Re-checked at 985px that
every mobile rule is correctly scoped — desktop still gets the 36px select, the
18px blur and the two-column grid. Per the standing no-local-DB constraint there
is no signed-in end-to-end check; the authenticated layouts were verified by
mounting the real shell markup against the real stylesheet at each width.

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
