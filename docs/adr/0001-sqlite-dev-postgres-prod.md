# ADR 0001 — SQLite in development, Postgres in production

**Status:** Superseded · accepted 2026-08-24, superseded 2026-08-25
**Superseded by:** the Vercel deploy — `provider` is now `postgresql` everywhere.
See [Outcome](#outcome-2026-08-25) for what actually happened and what is left.
**Context:** SkillSwitch P1 (watch → record → human feedback loop)

## Context

SkillSwitch has to be demonstrable on a student laptop, offline, in under five
minutes — E-Cell judging, college TPO demos, and hackathon rounds all happen on
whatever machine is in the room. At the same time the data model is genuinely
relational (tenants, cohorts, append-only mentor history, per-language lesson
assets) and the production target is a managed Postgres.

Docker was not an option on the target machine, and requiring a hosted Postgres
for a demo means the demo fails when the venue Wi-Fi does.

## Decision

Run **SQLite as the development datasource** and treat **Postgres as the
production target**, with a single Prisma schema serving both.

Two consequences are accepted deliberately:

1. **Enum-ish columns are `String`, not DB enums.** Prisma 6.2+ *does* support
   enums on SQLite, so this is a choice rather than a limitation. The canonical
   values live in `packages/shared/src/enums.ts` as `as const` unions and are
   enforced at the API edge by the zod contracts. Reason: the React app needs the
   same value sets and human labels (`SWITCH_REASON_LABELS`,
   `CONSENT_SCOPE_LABELS`) and cannot import a Prisma enum. One definition beats
   two that drift. The database is not the validator.

2. **No scalar lists.** Arrays are **PostgreSQL-only** in Prisma — SQLite cannot
   use `String[]` at all, so `preferredLanguages`, `languages`, `skills`,
   `rubric`, `items`, `sourceFeedbackIds` and `rubricScores` are `Json`. Reads go
   through `readList()`, `readRecord()` and `readObjectList<T>()` in
   `packages/db/src/index.ts` so the parse-or-cast lives in exactly one place.
   The helpers accept both an already-parsed value and a raw JSON string, which
   is why the same call sites survive the swap to Postgres.

**Version floor:** `Json` on SQLite requires Prisma **≥ 6.2.0**. The workspace
pins `^6.2.1`. Downgrading below that breaks `prisma db push`.

## Outcome (2026-08-25)

The decision above lasted one day. Deploying to Vercel forced Postgres in
production, and **Prisma has no per-environment `provider`** — it is one value in
one schema — so there was no way to keep SQLite in dev without maintaining a
second schema that would drift. The dual-datasource half of this ADR is dead:
`provider = "postgresql"` is now the only setting, and **local development needs a
Postgres `DATABASE_URL` too** (a second free Supabase project is the clean way).

The part that held up completely was consequence 2. The `read*()` helpers in
`packages/db/src/index.ts` accept both parsed JSONB and a raw JSON string, so the
swap to Postgres changed **zero call sites**. That was the whole bet of this ADR
and it paid.

What the "runs in the room, offline" requirement cost: a laptop demo now needs
network. That requirement was real and is not gone — it is just no longer served
by SQLite. If it comes back, the answer is a local Postgres, not a second schema.

### Hardening: what got done

Both DB-level items landed in `packages/db/prisma/postgres-hardening.sql`, as a
hand-run file rather than an npm script — `db push` has no migration file to host
raw SQL. It carries the partial unique index for **one active mentor per student**,
which is the item flagged below as mattering most, plus a partial index for the
retention sweep.

One correction to the snippet that was pre-registered here: it named the columns
as unquoted `student_id` / `ended_at`. The schema uses model-level `@@map` but no
field-level `@map`, so tables are snake_case while **columns keep their camelCase
Prisma names** and must be double-quoted. The version written above this section
would have errored.

### Hardening: what is still open

`Json` list columns → native `String[]`. Still the highest-value remaining win,
and still not done — it is a schema change plus deleting the `read*()` helpers
call site by call site, which is a separate change from a deploy.

Native Postgres enums remain rejected, for the original reason: the React app
needs the same value sets and cannot import a Prisma enum.

## Migrating to Postgres

> Historical — this is the plan as written on 2026-08-24. See
> [Outcome](#outcome-2026-08-25) above for what was actually done, including a
> correction to step 4's SQL.

1. `provider = "sqlite"` → `provider = "postgresql"` in
   `packages/db/prisma/schema.prisma`.
2. `DATABASE_URL` → a `postgresql://` connection string.
3. `npx prisma migrate dev --name init` (dev uses `db push`; production gets
   real migration files from this point on).
4. Optional hardening, in this order of value:
   - `Json` list columns → `String[]`. This is the real win — arrays are
     Postgres-only, so it is the one thing SQLite genuinely could not do. The
     `read*()` helpers become no-ops and can be deleted call-site by call-site.
   - Add the partial unique index SQLite cannot express:
     `CREATE UNIQUE INDEX one_active_mentor ON mentor_assignments (student_id) WHERE ended_at IS NULL;`
   - Optionally promote `String` enum columns to native Postgres enums — but
     note this reintroduces the two-definitions problem with the web app, which
     is why it was avoided in the first place.

Step 4's middle item matters most. "A student has exactly one active mentor" is
currently enforced in application code (`assignInitialMentor` /
`switchMentor` close the old row inside a transaction). On Postgres it becomes a
database invariant, which is where it belongs.

## Consequences

**Good:** zero external services for dev, one `npm run setup`, seed data
reproducible on any machine, and no schema rewrite to go to production.

**Bad:** the dev database does not reject a bad enum value or a duplicate active
mentor assignment — only the API does. Integration tests must therefore go
through the API layer, not the Prisma client, to be meaningful.

**Rejected alternatives:**

- *Docker Compose with Postgres locally* — correct, and unusable on the target
  machine. Rejected on the "runs in the room" requirement.
- *SQLite in production too* — plausible for a single-college pilot, fails on
  concurrent writes once multiple colleges and a mentor pool share the instance,
  and offers no managed backup story for student data under DPDP.
- *Mongo/document store* — the mentor-switch history and tenant boundaries are
  exactly the joins a relational store is for.
