-- Postgres-only constraints that Prisma's schema language cannot express.
--
-- Not wired into any npm script, and deliberately so: this project uses
-- `prisma db push`, which has no migration file to host raw SQL. Run it by hand
-- once against a new database (Supabase SQL editor, or psql), after `db:push`.
--
-- Everything here is idempotent, so re-running it is safe.
--
-- Note the quoted camelCase column names. The schema uses model-level @@map
-- ("mentor_assignments") but no field-level @map, so table names are snake_case
-- while columns keep their Prisma field names — and unquoted identifiers get
-- folded to lowercase by Postgres, which would not match. ADR 0001 pre-registered
-- the first index below with unquoted snake_case columns; that version does not
-- run.

-- ---------------------------------------------------------------------------
-- 1. One active mentor per student.
--
-- This is the invariant the whole product rests on, and until now it lived only
-- in application code: assignInitialMentor() and switchMentor()
-- (apps/api/src/modules/mentorship/service.ts) close the open row and open a new
-- one inside a transaction. That is correct, but it is a promise, not a
-- guarantee — two concurrent switch requests, or one bad backfill script, and a
-- student has two active mentors with no error raised anywhere.
--
-- A partial unique index makes the database refuse it. SQLite could not express
-- this, which is why it waited for the Postgres move (see ADR 0001).
--
-- Scoped to the "endedAt IS NULL" subset only: mentor history is append-only and
-- a student is expected to accumulate many closed assignments.
CREATE UNIQUE INDEX IF NOT EXISTS one_active_mentor
  ON mentor_assignments ("studentId")
  WHERE "endedAt" IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Retention sweep support.
--
-- purgeExpiredMedia() (apps/api/src/jobs/retention.ts) scans for assets whose
-- retention window has closed and that are not already deleted. The schema's
-- @@index([retentionUntil]) covers the range half of that; this partial index
-- also excludes rows the sweep has already purged, which is the majority of the
-- table once the platform has been running a while.
CREATE INDEX IF NOT EXISTS media_assets_retention_sweep
  ON media_assets ("retentionUntil")
  WHERE "deletedAt" IS NULL;

-- ---------------------------------------------------------------------------
-- What is deliberately NOT here
--
-- * Json list columns -> native String[]. ADR 0001 calls this the highest-value
--   Postgres win, and it still is — but it is a schema.prisma change plus the
--   removal of readList()/readRecord()/readObjectList() call site by call site,
--   not a one-off DDL statement. Separate change.
--
-- * String enum columns -> native Postgres enums. Rejected for the same reason
--   as in ADR 0001: the React app needs the same value sets and cannot import a
--   Prisma enum, so promoting them reintroduces two definitions that drift.
--   packages/shared/src/enums.ts stays the single source of truth.
