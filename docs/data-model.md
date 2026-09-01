# Data model

Source of truth: `packages/db/prisma/schema.prisma`. This document explains
*why* the tables look like they do — the parts a schema file cannot say.

## Tenancy

```
Organization ──< OrgMembership >── User
     │
     ├──< Cohort ──< StudentProfile
     └──< Subscription        (seats, status, pricePerSeat)
```

Colleges buy seats. Students belong to exactly one college through
`OrgMembership(role: 'student')`, and optionally to a `Cohort` ("TE Computer
2026") for reporting.

**Mentors deliberately have no `OrgMembership`.** The mentor pool is
cross-institutional. This is not an oversight — switching only means something if
a student can reach mentors beyond their own campus, and a mentor pool locked to
one college is just that college's existing training cell with extra steps.

`Subscription` is the B2B2C hinge: the college pays, the student pays nothing,
and `seatsUsed` is counted from `OrgMembership`, not from activity.

## People

```
User (role: student | mentor | college_admin | platform_admin)
 ├── StudentProfile (preferredLanguages: Json string[], cohortId, branch, year)
 └── MentorProfile  (languages, skills, maxActiveStudents, isAcceptingStudents)
```

`preferredLanguages` and `MentorProfile.languages` are the **matching
dimension**, not a UI preference. A student who thinks in Marathi is matched to a
mentor who can actually coach in Marathi. That is the product.

They are `Json` rather than `String[]` because Prisma scalar lists are
Postgres-only — see [ADR 0001](adr/0001-sqlite-dev-postgres-prod.md). Read them
through `readList()`, never by casting inline.

`maxActiveStudents` is a hard capacity gate, checked before any switch. A mentor
at capacity cannot be switched *to*, which is what keeps "human review" from
quietly degrading into a backlog.

## Curriculum

```
Track ──< Module ──< Lesson ──< LessonAsset (language, mediaId)
                        └──< Assignment (brief, rubric: Json, maxDurationSeconds)
```

`LessonAsset` is the multilingual unit: one row per (lesson, language), each
pointing at its own `MediaAsset`. There is no "default video plus subtitles"
path, because a subtitle track is not the same product as a lesson delivered in
your language.

Language resolution falls back in order **requested → hi → en** (see
`pickAsset()` in `apps/api/src/modules/curriculum/routes.ts`), and the UI shows
which languages a lesson genuinely has rather than silently substituting.

`Assignment.rubric` is `Json` shaped `[{ key, label, max }]`. It is the contract
between the mentor's review form and every score that gets aggregated later —
feedback submission rejects any key not in the rubric and any score above
`criterion.max`.

## The core loop

```
Assignment ──< Submission (status, mediaId, note) ──1:1── Feedback
                                                            │
                                                            └──> WeeklyPlan
```

`Submission.status` walks `draft → uploading → submitted → in_review →
reviewed`. `in_review` is set when a mentor *opens* the submission, so the
student can see that a human is actually watching.

`Feedback` is 1:1 with `Submission` (`submissionId @unique`) and holds
`rubricScores: Json`, plus three human fields: `freeform` (required, min 20
chars), `strengths`, and `nextStep`.

`WeeklyPlan` is the only AI-touched table, and it is constrained on purpose:

- `sourceFeedbackIds: Json string[]` — never empty. `buildWeeklyPlan()` returns
  `null` when a student has no human feedback yet. **No feedback, no plan.**
- `items: Json [{ title, why, sourceFeedbackId, done }]` — every item carries the
  feedback row it was derived from.
- `model` records what produced it (currently `rule-based-v1` — a deterministic
  composer, no LLM call).
- `version` increments only when new feedback IDs appear, so a student's plan
  doesn't churn between page loads.

This is the structural version of the promise "AI never assesses you". The AI
layer can only restructure rows that a human mentor already wrote.

## Mentor history — append-only

```
MentorAssignment (studentId, mentorId, startedAt, endedAt)   endedAt IS NULL == active
MentorSwitchEvent (studentId, fromMentorId, toMentorId, reasonCode, note)
```

Switching never updates a row in place. It closes the current assignment
(`endedAt = now()`), opens a new one, and writes a `MentorSwitchEvent` — all in
one transaction. Consequences:

- A student's full mentorship history is reconstructable, so a new mentor starts
  with context instead of from zero.
- `reasonCode` accumulates into the answer to "which mentor–student pairings
  fail, and why". A competitor can copy a switch button in a sprint; they cannot
  copy this table.

`SWITCH_COOLDOWN_DAYS` (7) guards against thrash. The initial match is written as
a switch event with `reasonCode: 'initial_assignment'` so the timeline has no
gaps — reports filter that code out.

On Postgres this gets the partial unique index that SQLite cannot express
(see [ADR 0001](adr/0001-sqlite-dev-postgres-prod.md)); today the one-active-mentor
invariant lives in the service layer.

## Media

```
MediaAsset (provider, externalId, kind, status, ownerUserId, localPath,
            playbackUrl, retentionUntil, deletedAt)
```

One table for lesson video, student submissions, and lecture recordings,
distinguished by `kind`. `provider` records which backend holds the bytes, so a
provider migration is per-row rather than all-or-nothing.

`retentionUntil` is set **at creation time**, not by a later job — a row that
never gets a retention date is a row that never gets deleted, and that is the
failure mode you find out about during an audit. `deletedAt` marks a purged
asset; the row survives (audit trail) with `localPath`/`playbackUrl` nulled and
`status: 'deleted'`.

Video never streams through the API in production. See `MediaProvider` in
`apps/api/src/lib/media.ts`: the browser gets a signed ticket, uploads straight
to the provider, and the provider calls our webhook. `LocalMediaProvider` — the
only implementation that accepts bytes through the API — exists so the stack
runs with no third-party account, and is explicitly dev-only.

## Consent

```
ConsentRecord (userId, policyVersion, scope, granted, grantedAt, revokedAt,
               guardianName, guardianEmail)
```

Append-only. Granting, re-confirming, and withdrawing all INSERT; "we updated the
row" is not an audit trail. Latest row per scope wins. See
[DPDP compliance](dpdp-compliance.md).

## Live lectures + recordings

```
LiveClass (mentorId, orgId?, title, description, skill?, language, status,
           scheduledAt, durationMinutes, capacity, joinUrl?, startedAt?,
           endedAt?, recordingMediaId?, recordingPublishedAt?)

LiveClassRegistration (classId, studentId, registeredAt, attendedAt?,
                       watchedSeconds, completedAt?)
```

One mentor teaching a room. Deliberately **not** `LiveSession` — that is the 1:1
booking below, and conflating "35 students in a lecture" with "one student in a
call" would force capacity, registration, and recording concerns into a table
that needs none of them.

`orgId` is null by default, meaning *open to every college*. A non-null `orgId`
restricts the class to that college's students. Every student-facing query goes
through `visibilityFilter()` in `apps/api/src/modules/live/service.ts`, which is
`{ OR: [{ orgId: null }, { orgId: { in: myOrgIds } }] }` — so a class is either
public or scoped, never accidentally both.

**Status is stored but not trusted.** A mentor who forgets to press "End" leaves
`status: 'live'` in the row forever, and every list would keep advertising a
lecture that finished last Tuesday. `effectiveLiveClassStatus()` in
`@skillflex/shared` derives the real status from the clock —
`scheduledAt + durationMinutes` in the past means ended, whatever the column
says. The column is the mentor's *intent*; the derived value is what students
see. The consequence is that "ended" cannot appear in a `WHERE` clause, so both
list routes select `status in ('scheduled','live')` and drop ended rows in JS.
Mentors additionally get `storedStatus` alongside `status`, which is what lets
the console say "auto-ended — you never pressed End".

**`joinUrl` is not part of the class payload.** It is nulled in every serialized
response unless the caller is registered *and* inside the join window, and the
only route that ever returns it is `POST /live/classes/:id/join` — which stamps
`attendedAt` in the same call, so the link and the record of having used it
cannot disagree. Starting a class with no `joinUrl` is rejected (400
`NO_JOIN_URL`) rather than showing a room full of students a Join button that
goes nowhere.

`LiveClassRegistration` is the single row for both halves of the lifecycle:
`attendedAt` for the live room, `watchedSeconds`/`completedAt` for the
recording. It is created lazily by `POST /live/recordings/:id/progress` for
students who never registered and only ever watched the recording — otherwise
library-only viewers would have nowhere to store a resume point. `watchedSeconds`
only ever moves forward (`Math.max`) and `completedAt` latches once set, so
scrubbing backwards cannot un-complete a lecture. Registrations survive a
cancelled class; cancelling is a soft status change, because the attendance
record is what the college's report is made of.

## Scheduled sessions (P2, schema only)

`MentorAvailability` and `LiveSession` are in the schema but have no routes yet.
They are the **1:1** live-session upsell — one student, one mentor, one booked
slot — and are unrelated to `LiveClass` above despite the similar name. The P1
loop is asynchronous video review on purpose, because async is what makes one
mentor able to serve 25 students.
