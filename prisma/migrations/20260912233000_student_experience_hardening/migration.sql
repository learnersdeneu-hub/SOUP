ALTER TYPE "ApplicationFeeStatus" ADD VALUE IF NOT EXISTS 'STUDENT_PAYING';
ALTER TYPE "ApplicationFeeStatus" ADD VALUE IF NOT EXISTS 'SOUP_PAYING';
ALTER TYPE "ApplicationFeeStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';

ALTER TABLE "profiles"
ADD COLUMN "communicationPreferences" JSONB;

CREATE TYPE "OfferConditionStatus" AS ENUM ('OPEN','IN_PROGRESS','COMPLETE','WAIVED');
CREATE TABLE "offer_conditions" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "OfferConditionStatus" NOT NULL DEFAULT 'OPEN',
  "dueAt" TIMESTAMP(3),
  "sourceUrl" TEXT,
  "sourceCheckedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "offer_conditions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "offer_conditions_applicationId_status_dueAt_idx" ON "offer_conditions"("applicationId","status","dueAt");
ALTER TABLE "offer_conditions" ADD CONSTRAINT "offer_conditions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "student_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "CounselorSessionStatus" AS ENUM ('REQUESTED','SCHEDULED','COMPLETED','CANCELLED','NO_SHOW');
CREATE TABLE "counselor_sessions" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "counselorUserId" TEXT,
  "requestedByUserId" TEXT NOT NULL,
  "status" "CounselorSessionStatus" NOT NULL DEFAULT 'REQUESTED',
  "requestedDate" TIMESTAMP(3),
  "requestedTimeNote" TEXT,
  "scheduledFor" TIMESTAMP(3),
  "durationMinutes" INTEGER NOT NULL DEFAULT 30,
  "meetingUrl" TEXT,
  "studentNote" TEXT,
  "staffNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "counselor_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "counselor_sessions_profileId_status_scheduledFor_idx" ON "counselor_sessions"("profileId","status","scheduledFor");
CREATE INDEX "counselor_sessions_counselorUserId_status_scheduledFor_idx" ON "counselor_sessions"("counselorUserId","status","scheduledFor");
ALTER TABLE "counselor_sessions" ADD CONSTRAINT "counselor_sessions_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "counselor_sessions" ADD CONSTRAINT "counselor_sessions_counselorUserId_fkey" FOREIGN KEY ("counselorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "counselor_sessions" ADD CONSTRAINT "counselor_sessions_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
