# SkillFlex

**Human, multilingual & switchable soft-skills mentorship for Indian students.**

Colleges buy seats. Students pay nothing. Every piece of feedback a student
receives is written by a human mentor — the AI layer is allowed to reorganise
that feedback into a weekly plan, and nothing else.

---



## The six things it does

| | |
| --- | --- |
| **Learn in your language** | Lessons carry a separate video per language (English / हिंदी / मराठी). Not subtitles — a different recording. |
| **Practice on camera** | Weekly task-based assignments recorded in the browser, capped by the assignment's duration limit. |
| **A human reviews it** | A real mentor watches the video and writes scores + specific feedback. No AI scores anyone. |
| **Attend live, or watch it later** | Mentors schedule one-to-many live lectures; the recording lands in an on-demand library that resumes where you left off. |
| **Drill a word in two minutes** | Say a word out loud and find out *which syllable* slipped, with a hand-written fix for the mistake people actually make. Runs on the browser's own speech engine — no key, no cost. Never scored. |
| **Switch mentors freely** | Not the right fit? Switch, keep all your history, pay nothing extra. The reason is recorded. |

The switch is the product. Every incumbent locks you to whoever you were
assigned; the reason codes that accumulate when students leave a mentor are the
asset that compounds.

## Stack

- **API** — Node 20+ · Fastify 5 · TypeScript (ESM, run via `tsx`) · zod · JWT
- **DB** — Prisma 6 · Postgres (Supabase) in dev and prod ([ADR 0001](docs/adr/0001-sqlite-dev-postgres-prod.md))
- **Web** — React 18 · Vite 6 · TanStack Query · react-router 6 · plain CSS
- **Video** — browser `MediaRecorder`; pluggable `MediaProvider` (local dev / Supabase Storage / Bunny stub)
- **Hosting** — one Vercel project: static SPA + the whole API as a catch-all serverless function

Mobile-first PWA, not React Native — a student on a shared 4G phone should not
have to install anything to record a two-minute answer.

No Docker, no Tailwind, no Python. Every one of those is a thing that can fail in
the ten minutes before a demo.

## First run

You need a Postgres connection string before anything will boot. Prisma has no
per-environment `provider`, so there is no SQLite fallback — the cheapest path is
a second free [Supabase](https://supabase.com) project used only for dev.

```bash
npm run setup
```

That runs `npm install`, creates `.env` from `.env.example`, generates the Prisma
client, pushes the schema, and seeds a full demo college. Put your dev
`DATABASE_URL` in `.env` first — read the comment above it, the pooler port
matters.

> `npm install` writes `node_modules/`. If this folder is inside OneDrive,
> consider pausing sync first — thousands of small files plus file locks is a bad
> combination.

Then:

```bash
npm run dev
```

- Web → http://localhost:5173
- API → http://localhost:4000 (`/api/health` to check)

Vite proxies `/api` and `/media` to the API so the browser sees a single origin.
That matters: `getUserMedia` requires a secure context, and `localhost` counts.

### Demo logins

All seeded accounts use the password **`password123`**.

| Role | Email | What you'll see |
| --- | --- | --- |
| Student | `rahul@student.avcoe.in` | Has a reviewed submission, mentor feedback and a generated plan |
| Student | `priya@student.avcoe.in` | Fresh — good for walking the record → submit loop |
| Mentor | `anjali@skillflex.in` | Review queue with work waiting |
| College admin | `tpo@avcoe.in` | The accreditation dashboard |
| Platform admin | `admin@skillflex.in` | API-only provisioning |

**The demo path that matters:** sign in as Priya → record an assignment → sign in
as her mentor → review it → sign back in as Priya and watch the human feedback,
then the plan derived from it.

### Scripts

```bash
npm run dev          # api + web together
npm run typecheck    # every workspace
npm run db:studio    # Prisma Studio
npm run db:reset     # wipe + reseed (destroys local data)
```

## Layout

```
api/
  server.mjs      Vercel entry — re-exports the bundled Fastify app
apps/
  api/    Fastify server — 15 route modules under src/modules/
  web/    React PWA — one folder per feature under src/features/
packages/
  db/     Prisma schema, client singleton, Json read helpers, seed
  shared/ Enums + zod contracts — the single source of truth for both sides
docs/     ADR, data model, DPDP notes
```

`packages/shared` is imported by both the API and the web app as TypeScript
source. One definition of what a `Language`, a `SwitchReasonCode` or a valid
feedback payload is, shared across the wire.

## Design decisions worth knowing

**AI cannot assess you, structurally.** `buildWeeklyPlan()` returns `null` when a
student has no human feedback. Every plan item carries the `sourceFeedbackId` it
came from. The composer is deterministic — `model: 'rule-based-v1'`, no LLM call
in the P1 path. The promise is enforced by the data model, not by a policy
document. See [data-model.md](docs/data-model.md).

**The pronunciation drill has no score column.** A machine listening to a
student is the one feature that could quietly break the promise above, so the
wall is in the schema rather than in copy: `PronunciationAttempt` stores
`matched: Boolean` and nothing resembling a score, level or accuracy percentage.
It never writes a `Feedback` row, so it has no `sourceFeedbackId`, so
`buildWeeklyPlan()` structurally cannot turn a bad morning of practice into a
plan item. It is absent from `GET /api/orgs/report`, and mentors have no route
over it at all. What a student sees is "no error detected", never "correct" —
because that is the most the engine can honestly claim.

**The support bot is never shown your work.** `/ai-support` is a real LLM call
(Groq by default, any OpenAI-compatible endpoint via `SUPPORT_LLM_BASE_URL`), and
it is the second place a machine writes text a student reads — so it gets the
same treatment as the drill. The route hands the engine exactly two things: that
user's own `support_messages` rows, and a static blurb about how the app works.
No feedback row, no recording, no plan, no rubric ever enters the call, because
the route never loads one. It cannot comment on your English because it has never
seen any of it. The system prompt says so too, but that is the second line of
defence; the first is that the data is not in the request.

**Mentor history is append-only.** Switching closes the old `MentorAssignment`
and opens a new one inside a transaction; it never updates a row in place. Your
new mentor can see where you've been.

**The college never sees student video.** `GET /api/orgs/report` returns cohort
aggregates only, and ships a `note` field saying exactly that, which the dashboard
renders verbatim.

**Video never proxies through the API in production.** `MediaProvider` issues a
signed ticket; the browser uploads directly to a private Supabase Storage bucket
and then calls `POST /api/media/:id/complete`. `LocalMediaProvider` accepts bytes
through the API and is dev-only. This also sidesteps Vercel's 4.5 MB request-body
cap, which a phone recording would blow through immediately.

**A live lecture's status is derived, not trusted.** Mentors forget to press
"End". `effectiveLiveClassStatus()` decides from the clock whether a class is
over, and the stored column is treated as the mentor's intent — so a class left
at `live` since Tuesday stops advertising itself as in progress. The room link is
withheld from every payload except `POST /api/live/classes/:id/join`, which
stamps attendance in the same call.

**DPDP consent is versioned, append-only, and withdrawal does something.**
Revoking video consent schedules every recording you own for deletion in 7 days
and tells you how many. Known gaps are listed honestly in
[dpdp-compliance.md](docs/dpdp-compliance.md) — read that list before claiming
compliance to anyone.

## Deploy (Vercel)

One project, root directory = repo root. `vercel.json` wires it up: the SPA is
served from `apps/web/dist` and the entire Fastify app runs as a single catch-all
function at `api/[...path].mjs`, so `/api/*` stays same-origin and no CORS or
client URL config is needed.

```bash
npm run vercel-build   # prisma generate -> esbuild the API -> vite build
```

Three things you have to do by hand:

1. A Supabase project. `DATABASE_URL` must be the **session-mode pooler**
   (`aws-0-<region>.pooler.supabase.com:5432`) — not the 6543 transaction pooler,
   because four route handlers use interactive `$transaction()` and need
   connection affinity, and not the direct `db.<ref>` host, which is IPv6-only on
   the free tier and unreachable from Vercel.
2. A Storage bucket named `submissions`, **private**. Playback goes through signed
   URLs; a public bucket would put student video on the open internet.
3. Set the function region near your Supabase region — Hobby defaults to `iad1`.

Env vars: everything in `.env.example`, plus `MEDIA_PROVIDER=supabase`,
`NODE_ENV=production`, and a freshly generated `JWT_SECRET`. `SUPABASE_SERVICE_ROLE_KEY`
is admin-level — server-side only, never `VITE_`-prefixed or Vite inlines it into
the public bundle.

After the first `db:push`, run `packages/db/prisma/postgres-hardening.sql` once in
the Supabase SQL editor. It adds the constraints Prisma can't express — most
importantly the partial unique index enforcing one active mentor per student.

Retention runs as a Vercel Cron (`GET /api/internal/retention`, bearer
`CRON_SECRET`) rather than the `setInterval` used by the long-lived server, since
nothing in a serverless function lives long enough to hold a timer.

## Not built yet

- Live **1:1** sessions — `MentorAvailability` and `LiveSession` are in the schema, no
  routes. (One-to-many live *lectures* are built — that is `LiveClass`, a different table.)
- No video conferencing of our own — a mentor pastes a Meet/Zoom/Jitsi link and we
  gate access to it. Hosting the room is a much larger build than it looks.
- Lecture recordings are uploaded by the mentor after the fact; nothing records
  the live room automatically.
- Payments / invoicing (colleges are onboarded by hand at this stage)
- Notifications of any kind — email, push, WhatsApp
- Automated tests
- A curriculum-authoring console — tracks and assignments go in via API or seed
- Pronunciation feedback is **syllable-level, not phoneme-level**. The browser's
  speech engine returns words, not sounds, and it is biased toward real dictionary
  words — so a word said *slightly* wrong often comes back transcribed correctly.
  That is why the drill says "no error detected" rather than "correct". Phoneme
  scoring needs a paid engine (Azure Pronunciation Assessment or similar);
  `judgePronunciation()` in `packages/shared/src/pronunciation.ts` is pure and
  takes a list of candidate transcriptions, so an adapter slots in behind it
  without the UI changing.
- The drill **does not work in Firefox**, which has never shipped
  `SpeechRecognition` — Chrome, Edge, Safari and Samsung Internet only. Firefox
  gets an explanatory panel rather than a dead button; the rest of the app is
  unaffected.
- Only the 82 curated words carry a hand-written diagnosis. A word typed into the
  free-text box gets the syllable we think slipped and no note, which the page
  says out loud rather than dressing up.
- The **AI Support bot has no ticketing behind it.** It answers, and the thread is
  stored in `support_messages` — but nothing routes an unresolved problem to a
  human, and nobody is notified. It tells the student a human reads these, which
  is only true if someone actually reads the table. A real queue is the next step.
  With no `SUPPORT_LLM_API_KEY` set it falls back to a deterministic keyword
  responder, which covers the common cases (mic, camera, upload, login, missing
  feedback) and declines everything else honestly rather than guessing.
- The **mascot is not yet animated by Lottie.** `angry-owl.svg` carries its own
  SMIL animation and renders through an `<object>`; `lottie-web` is declared and a
  commented-out `initLottie()` points at `/assets/lottie/angry-owl.json`, which
  does not exist yet. Because that import is dynamic and unreachable, Rollup
  leaves the library out of the bundle entirely — it costs nothing until a real
  export lands. See `apps/web/public/assets/lottie/README.md`.
- `BunnyMediaProvider` is still a stub that throws — Supabase Storage is the real
  provider. Bunny/Cloudflare matter later, when video egress cost does.
- Signed playback URLs are minted once at upload and stored, so a forwarded link
  works until it expires. Re-signing per read is the hardening step; it touches
  all eight read paths.
- `Json` list columns are still `Json` rather than native Postgres `String[]`
  ([ADR 0001](docs/adr/0001-sqlite-dev-postgres-prod.md))

## Status

P1 vertical slice: **watch → record → human feedback → derived plan → switch
mentor**, wired end to end, plus the college dashboard and the DPDP surface.

Runs locally and builds for Vercel. Typecheck is clean across all four
workspaces, and the serverless handler has been exercised against every route
module. Seeded lessons carry no video, so `LessonPage` shows its empty state until
real lesson video is uploaded — assignments and the mentor loop are unaffected.
