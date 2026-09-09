-- One-off: normalise the pre-rebrand logins to @skillflex.in.
--
-- This project was called SkillSwitch. Commit e032881 ("Rebrand SkillSwitch ->
-- SkillFlex") renamed everything in the repo, and a later change dropped the
-- accidental `mentor.` subdomain — but a seed only ever writes a *fresh*
-- database. Any Supabase instance seeded before those commits still holds the
-- old addresses, and no amount of editing seed.ts will move them. Hence this.
--
-- What is actually in a pre-rebrand instance, and where each row has to land:
--
--   anjali@mentor.skillswitch.in  ->  anjali@skillflex.in   (mentor)
--   sagar@mentor.skillswitch.in   ->  sagar@skillflex.in    (mentor)
--   neha@mentor.skillswitch.in    ->  neha@skillflex.in     (mentor)
--   admin@skillswitch.in          ->  admin@skillflex.in    (platform admin)
--
-- Four rows, not three. The platform admin is on the old domain too, so the
-- `admin@skillflex.in` login documented in README.md does not currently work
-- either; the file is still named for mentors because that is the ask it came
-- from. Students and the TPO were never rebranded (@avcoe.in) and are untouched.
--
-- Two things are wrong at once — the `mentor.` subdomain and the old brand — so
-- this does not REPLACE a substring. It keeps the local part and rebuilds the
-- domain, which lands every legacy variant on the same canonical form and is
-- therefore idempotent by construction: after it runs, nothing matches the WHERE.
--
-- Run in the Supabase SQL editor (or psql), one statement at a time, top to
-- bottom. Not wired into any npm script, for the same reason as
-- postgres-hardening.sql: this project uses `prisma db push`, which has no
-- migration file to host raw SQL.
--
-- Signed-in sessions survive. `users.email` is the only address the app stores
-- for an account (ConsentRecord.guardianEmail is a student's guardian, unrelated),
-- and although the JWT payload does carry an `email` claim, nothing ever resolves
-- a user by it — every authenticated path goes through `sub`, the user id. The
-- claim just goes stale until the next sign-in, and /me re-reads the row by id,
-- so the UI shows the new address on the next page load.

-- 1. Look before touching. Shows exactly what each row becomes.
--    Expect 4 rows on a pre-rebrand instance, 0 if this has already run.
SELECT id,
       name,
       role,
       email                                        AS current_email,
       split_part(email, '@', 1) || '@skillflex.in' AS becomes
FROM users
WHERE email ~ '@(mentor\.)?skillswitch\.in$'  -- pre-rebrand, both variants
   OR email ~ '@mentor\.skillflex\.in$'       -- rebranded, before the subdomain fix
ORDER BY role, email;

-- 2. Collision check. MUST return 0 rows before you run step 3.
--    users.email is UNIQUE (schema.prisma:99), so this catches both ways the
--    rename could fail: a target address that already exists on another row, and
--    two legacy rows that would collapse onto the same new address. The
--    already-canonical rows are included in the grouping on purpose — that is
--    what makes the first case visible.
SELECT split_part(email, '@', 1) || '@skillflex.in' AS proposed_email,
       count(*)                                     AS rows_landing_here,
       string_agg(email, ', ' ORDER BY email)        AS from_addresses
FROM users
WHERE email ~ '@(mentor\.)?skillswitch\.in$'
   OR email ~ '@mentor\.skillflex\.in$'
   OR email LIKE '%@skillflex.in'
GROUP BY 1
HAVING count(*) > 1;

-- 3. The rename. Expect "UPDATE 4".
UPDATE users
SET email = split_part(email, '@', 1) || '@skillflex.in'
WHERE email ~ '@(mentor\.)?skillswitch\.in$'
   OR email ~ '@mentor\.skillflex\.in$';

-- 4. Read back. Expect exactly 4 rows — admin, anjali, neha, sagar — all
--    @skillflex.in, matching the demo-logins table in README.md. Re-running
--    step 1 now should return nothing.
SELECT email, name, role
FROM users
WHERE email LIKE '%@skillflex.in'
ORDER BY email;
