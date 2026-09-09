-- One-off: add the pronunciation practice table.
--
-- This project uses `prisma db push` and has no migrations directory, so there
-- is no migration file to host DDL — the same reason postgres-hardening.sql and
-- rename-mentor-emails.sql exist as hand-run scripts.
--
-- The DDL below is not hand-written. It is exactly what Prisma emits for this
-- model, produced with:
--
--   prisma migrate diff --from-schema-datamodel <previous> \
--                       --to-schema-datamodel prisma/schema.prisma --script
--
-- That matters: a hand-written CREATE TABLE that differs from Prisma's — a
-- missing default, a snake_cased column — would leave the database and the
-- schema silently out of step, and the next `prisma db push` would try to
-- "fix" it. Because this matches, a later `db:push` is a no-op.
--
-- Column names are quoted camelCase on purpose. The models in this schema use
-- @@map() for table names but no field-level @map, so Postgres columns keep
-- their camelCase spelling and must be quoted to survive folding.
--
-- Safe to re-run: every statement is guarded.

-- Prisma's own output, wrapped in existence guards.
CREATE TABLE IF NOT EXISTS "pronunciation_attempts" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "wordId" TEXT,
    "word" TEXT NOT NULL,
    "heard" TEXT,
    "matched" BOOLEAN NOT NULL,
    "engine" TEXT NOT NULL DEFAULT 'browser',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pronunciation_attempts_pkey" PRIMARY KEY ("id")
);

-- Serves GET /api/practice/summary, which reads one student's last 60 days.
CREATE INDEX IF NOT EXISTS "pronunciation_attempts_studentId_createdAt_idx"
    ON "pronunciation_attempts"("studentId", "createdAt");

-- ADD CONSTRAINT has no IF NOT EXISTS, hence the guard. ON DELETE CASCADE is
-- deliberate: practice history is the student's own scratchpad and has no value
-- once the profile is gone, so it should not outlive them.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'pronunciation_attempts_studentId_fkey'
    ) THEN
        ALTER TABLE "pronunciation_attempts"
            ADD CONSTRAINT "pronunciation_attempts_studentId_fkey"
            FOREIGN KEY ("studentId") REFERENCES "student_profiles"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Expect one row: the table, with 8 columns and no score/accuracy/grade column.
-- That absence is the design, not an omission — see docs/data-model.md.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pronunciation_attempts'
ORDER BY ordinal_position;
