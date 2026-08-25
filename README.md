# SkillSwitch

**Human, multilingual & switchable soft-skills mentorship for Indian students.**

Colleges buy seats. Students pay nothing. Every piece of feedback a student
receives is written by a human mentor — the AI layer is allowed to reorganise
that feedback into a weekly plan, and nothing else.

> ⚠️ **Nothing in this repo has been executed yet.** It was written end-to-end
> without an install, a `prisma validate`, a typecheck or a boot. Expect the
> first `npm run setup` to surface small fixes. See [First run](#first-run).

---

## The four things it does

| | |
| --- | --- |
| **Learn in your language** | Lessons carry a separate video per language (English / हिंदी / मराठी). Not subtitles — a different recording. |
| **Practice on camera** | Weekly task-based assignments recorded in the browser, capped by the assignment's duration limit. |
| **A human reviews it** | A real mentor watches the video and writes scores + specific feedback. No AI scores anyone. |
| **Switch mentors freely** | Not the right fit? Switch, keep all your history, pay nothing extra. The reason is recorded. |

The switch is the product. Every incumbent locks you to whoever you were
assigned; the reason codes that accumulate when students leave a mentor are the
asset that compounds.

## Stack

- **API** — Node 20+ · Fastify 5 · TypeScript (ESM, run via `tsx`) · zod · JWT
- **DB** — Prisma 6 · SQLite in dev, Postgres in prod ([ADR 0001](docs/adr/0001-sqlite-dev-postgres-prod.md))
- **Web** — React 18 · Vite 6 · TanStack Query · react-router 6 · plain CSS
- **Video** — browser `MediaRecorder`; pluggable `MediaProvider` (local dev / Bunny stub)

Mobile-first PWA, not React Native — a student on a shared 4G phone should not
have to install anything to record a two-minute answer.

No Docker, no Tailwind, no Python. Every one of those is a thing that can fail in
the ten minutes before a demo.

## First run

```bash
npm run setup
```

That runs `npm install`, creates `.env` from `.env.example`, generates the Prisma
client, pushes the schema to SQLite, and seeds a full demo college.

> `npm install` writes `node_modules/`. If this folder is inside OneDrive,
> consider pausing sync first — thousands of small files plus file locks is a bad
> combination.

Then:

```bash
npm run dev
```

- Web → http://localhost:5173
- API → http://localhost:4000 (`/health` to check)

Vite proxies `/api` and `/media` to the API so the browser sees a single origin.
That matters: `getUserMedia` requires a secure context, and `localhost` counts.

### Demo logins

All seeded accounts use the password **`password123`**.

| Role | Email | What you'll see |
| --- | --- | --- |
| Student | `rahul@student.avcoe.in` | Has a reviewed submission, mentor feedback and a generated plan |
| Student | `priya@student.avcoe.in` | Fresh — good for walking the record → submit loop |
| Mentor | `anjali@mentor.skillswitch.in` | Review queue with work waiting |
| College admin | `tpo@avcoe.in` | The accreditation dashboard |
| Platform admin | `admin@skillswitch.in` | API-only provisioning |

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
apps/
  api/    Fastify server — 9 route modules under src/modules/
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

**Mentor history is append-only.** Switching closes the old `MentorAssignment`
and opens a new one inside a transaction; it never updates a row in place. Your
new mentor can see where you've been.

**The college never sees student video.** `GET /api/orgs/report` returns cohort
aggregates only, and ships a `note` field saying exactly that, which the dashboard
renders verbatim.

**Video never proxies through the API in production.** `MediaProvider` issues a
signed ticket; the browser uploads directly and the provider calls our webhook.
`LocalMediaProvider` accepts bytes through the API and is dev-only.

**DPDP consent is versioned, append-only, and withdrawal does something.**
Revoking video consent schedules every recording you own for deletion in 7 days
and tells you how many. Known gaps are listed honestly in
[dpdp-compliance.md](docs/dpdp-compliance.md) — read that list before claiming
compliance to anyone.

## Not built yet

- Live 1:1 sessions — `MentorAvailability` and `LiveSession` are in the schema, no routes
- Payments / invoicing (colleges are onboarded by hand at this stage)
- Notifications of any kind — email, push, WhatsApp
- Real media provider — `BunnyMediaProvider` throws on `createUploadTicket()`
- Automated tests
- A curriculum-authoring console — tracks and assignments go in via API or seed

## Status

P1 vertical slice: **watch → record → human feedback → derived plan → switch
mentor**, wired end to end, plus the college dashboard and the DPDP surface.
Written, not yet run.
