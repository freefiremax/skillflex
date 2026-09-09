-- One-off: add the gamified battle attempts table (spelling / sentence / quiz).
--
-- Same convention as add-pronunciation-attempts.sql: this project uses
-- `prisma db push` with no migrations directory, so raw DDL lives in hand-run
-- scripts. The DDL is exactly what Prisma emits for the BattleAttempt model, so
-- a later `db:push` is a no-op rather than a repair. Column names are quoted
-- camelCase because the schema uses @@map() for tables but no field-level @map.
--
-- Safe to re-run: every statement is guarded.

CREATE TABLE IF NOT EXISTS "battle_attempts" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "battle_attempts_pkey" PRIMARY KEY ("id")
);

-- Serves GET /api/progress/leaderboard, which reads each student's recent
-- battle activity to sum wins.
CREATE INDEX IF NOT EXISTS "battle_attempts_studentId_createdAt_idx"
    ON "battle_attempts"("studentId", "createdAt");

CREATE INDEX IF NOT EXISTS "battle_attempts_mode_createdAt_idx"
    ON "battle_attempts"("mode", "createdAt");

-- ON DELETE CASCADE is deliberate: battle history is the student's own
-- scratchpad and has no value once the profile is gone.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'battle_attempts_studentId_fkey'
    ) THEN
        ALTER TABLE "battle_attempts"
            ADD CONSTRAINT "battle_attempts_studentId_fkey"
            FOREIGN KEY ("studentId") REFERENCES "student_profiles"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Expect one row: the table, with 7 columns and no score-as-percentage column.
-- Like pronunciation_attempts, battle history stores FACTS of effort, never a
-- grade — so it can feed a "top gainers" board without becoming an assessment.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'battle_attempts'
ORDER BY ordinal_position;
