-- One-off: add the AI Support conversation log (/ai-support).
--
-- Same convention as add-battle-attempts.sql and add-pronunciation-attempts.sql:
-- this project uses `prisma db push` with no migrations directory, so raw DDL
-- lives in hand-run scripts. The DDL is exactly what Prisma emits for the
-- SupportMessage model, so a later `db:push` is a no-op rather than a repair.
-- Column names are quoted camelCase because the schema uses @@map() for tables
-- but no field-level @map.
--
-- Safe to re-run: every statement is guarded.
--
-- Until this runs, POST /api/support/chat still answers — the route catches
-- P2021 (relation does not exist) and serves the reply without persisting it, so
-- the page works and only the history is empty. Running this turns the history on.

CREATE TABLE IF NOT EXISTS "support_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- Serves GET /api/support/history (one user's thread, newest first) and the
-- per-hour rate limit count on POST /api/support/chat. Both filter on userId and
-- order/range by createdAt, so the composite index covers each of them.
CREATE INDEX IF NOT EXISTS "support_messages_userId_createdAt_idx"
    ON "support_messages"("userId", "createdAt");

-- ON DELETE CASCADE is deliberate, and here it is a DPDP matter rather than a
-- convenience: a deleted account must not leave behind a transcript of what that
-- person typed into a chat box. Attached to users, not student_profiles, because
-- mentors file bug reports too.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'support_messages_userId_fkey'
    ) THEN
        ALTER TABLE "support_messages"
            ADD CONSTRAINT "support_messages_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Expect five rows. Note what is absent: no rubric, no score, no submission
-- reference. The support engine is handed this table's rows and a static blurb
-- about the app, never anything about the student's work — the "no AI assesses
-- anyone" wall is enforced by what this table cannot hold.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'support_messages'
ORDER BY ordinal_position;
