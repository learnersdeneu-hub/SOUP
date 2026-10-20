-- Extracurricular & Recommendations: new StudentCase JSON columns
-- (writingDetails, extracurricularMeta) plus five new tables for
-- activities, recommenders, their per-university assignments, their
-- submitted letters, and per-university writing-draft overrides. See
-- src/lib/applications/progress.ts, src/app/actions/activities.ts,
-- src/app/actions/recommenders.ts, src/app/actions/applicationWriting.ts.

-- AlterTable
ALTER TABLE "student_cases" ADD COLUMN IF NOT EXISTS "extracurricularMeta" JSONB,
ADD COLUMN IF NOT EXISTS "writingDetails" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "student_activities" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "activityType" TEXT NOT NULL,
    "roleTitle" TEXT,
    "organization" TEXT,
    "description" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "ongoing" BOOLEAN NOT NULL DEFAULT false,
    "hoursPerWeek" INTEGER,
    "weeksPerYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "recommenders" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subjectOrTitle" TEXT,
    "institution" TEXT,
    "relationshipToStudent" TEXT,
    "waiverAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "waiverAcknowledgedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'NOT_INVITED',
    "inviteToken" TEXT,
    "inviteTokenExpiresAt" TIMESTAMP(3),
    "invitedAt" TIMESTAMP(3),
    "lastInviteSentAt" TIMESTAMP(3),
    "remindersSentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommenders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "recommender_assignments" (
    "id" TEXT NOT NULL,
    "recommenderId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommender_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "recommendation_letters" (
    "id" TEXT NOT NULL,
    "recommenderId" TEXT NOT NULL,
    "submissionMethod" TEXT NOT NULL,
    "letterText" TEXT,
    "documentId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendation_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "application_writing_overrides" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "boxType" TEXT NOT NULL,
    "text" TEXT,
    "documentId" TEXT,
    "lastSavedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_writing_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "student_activities_profileId_position_idx" ON "student_activities"("profileId", "position");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "recommenders_inviteToken_key" ON "recommenders"("inviteToken");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "recommenders_profileId_status_idx" ON "recommenders"("profileId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "recommender_assignments_applicationId_idx" ON "recommender_assignments"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "recommender_assignments_recommenderId_applicationId_key" ON "recommender_assignments"("recommenderId", "applicationId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "recommendation_letters_recommenderId_key" ON "recommendation_letters"("recommenderId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "recommendation_letters_documentId_key" ON "recommendation_letters"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "application_writing_overrides_applicationId_boxType_key" ON "application_writing_overrides"("applicationId", "boxType");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "student_activities" ADD CONSTRAINT "student_activities_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "recommenders" ADD CONSTRAINT "recommenders_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "recommender_assignments" ADD CONSTRAINT "recommender_assignments_recommenderId_fkey" FOREIGN KEY ("recommenderId") REFERENCES "recommenders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "recommender_assignments" ADD CONSTRAINT "recommender_assignments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "student_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "recommendation_letters" ADD CONSTRAINT "recommendation_letters_recommenderId_fkey" FOREIGN KEY ("recommenderId") REFERENCES "recommenders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "recommendation_letters" ADD CONSTRAINT "recommendation_letters_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "application_writing_overrides" ADD CONSTRAINT "application_writing_overrides_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "student_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "application_writing_overrides" ADD CONSTRAINT "application_writing_overrides_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
