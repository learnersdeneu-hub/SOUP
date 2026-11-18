-- Two additions to close gaps found reviewing the Companion multi-
-- application run against what it was built to do:
--
-- 1. companion_learned_answers: a free-form answer Companion collected
--    directly from a student for a question outside SOUP's existing
--    structured fields. The unique (profileId, questionKey) constraint
--    means a later correction overwrites the earlier answer rather than
--    accumulating a second row -- a correction is the new truth.
-- 2. companion_run_events: staff-facing visibility into the run itself
--    (review verdicts, approvals, pause reasons) -- companion_fill_events
--    only ever recorded raw per-page fill counts.
--
-- See src/lib/companion/learnedAnswers.ts and src/app/admin/companion/page.tsx.

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CompanionRunEventKind" AS ENUM ('REVIEW', 'APPROVED', 'PAUSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "companion_learned_answers" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "questionLabel" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companion_learned_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "companion_run_events" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "applicationId" TEXT,
    "universityName" TEXT NOT NULL,
    "kind" "CompanionRunEventKind" NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companion_run_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "companion_learned_answers_profileId_questionKey_key" ON "companion_learned_answers"("profileId", "questionKey");
CREATE INDEX IF NOT EXISTS "companion_learned_answers_profileId_idx" ON "companion_learned_answers"("profileId");
CREATE INDEX IF NOT EXISTS "companion_run_events_profileId_createdAt_idx" ON "companion_run_events"("profileId", "createdAt");
CREATE INDEX IF NOT EXISTS "companion_run_events_applicationId_idx" ON "companion_run_events"("applicationId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "companion_learned_answers" ADD CONSTRAINT "companion_learned_answers_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "companion_run_events" ADD CONSTRAINT "companion_run_events_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "companion_run_events" ADD CONSTRAINT "companion_run_events_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "student_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS: this app reads and writes these tables exclusively through Prisma
-- (a direct Postgres connection that bypasses RLS entirely), never
-- through Supabase's PostgREST/client-side interface -- same pattern as
-- 20260925060000_enable_rls_all_public_tables and
-- 20261013140000_extracurricular_recommendations_rls. No policies are
-- added because none are needed; enabling RLS with no policy denies all
-- PostgREST/anon/authenticated access, which is the intended lockdown.
ALTER TABLE "companion_learned_answers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "companion_run_events" ENABLE ROW LEVEL SECURITY;
