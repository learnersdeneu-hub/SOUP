CREATE TYPE "ApplicationFeeStatus" AS ENUM ('UNKNOWN', 'NOT_REQUIRED', 'REQUIRED', 'PENDING', 'PAID', 'WAIVED');
CREATE TYPE "ApplicationEligibilityStatus" AS ENUM ('NOT_CHECKED', 'LIKELY_ELIGIBLE', 'NEEDS_REVIEW', 'NOT_ELIGIBLE');

ALTER TABLE "student_applications"
  ADD COLUMN "applicationKey" TEXT,
  ADD COLUMN "intake" TEXT,
  ADD COLUMN "startDate" TIMESTAMP(3),
  ADD COLUMN "deadlineAt" TIMESTAMP(3),
  ADD COLUMN "deadlineSourceUrl" TEXT,
  ADD COLUMN "deadlineCheckedAt" TIMESTAMP(3),
  ADD COLUMN "eligibilityStatus" "ApplicationEligibilityStatus" NOT NULL DEFAULT 'NOT_CHECKED',
  ADD COLUMN "eligibilityCheckedAt" TIMESTAMP(3),
  ADD COLUMN "eligibilitySourceUrl" TEXT,
  ADD COLUMN "eligibilityNotes" JSONB,
  ADD COLUMN "applicationFeeAmount" DECIMAL(12,2),
  ADD COLUMN "applicationFeeCurrency" TEXT,
  ADD COLUMN "applicationFeeStatus" "ApplicationFeeStatus" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "assignedStaffUserId" TEXT,
  ADD COLUMN "studentDeclarationAt" TIMESTAMP(3),
  ADD COLUMN "studentApprovedAt" TIMESTAMP(3),
  ADD COLUMN "lastStudentActionAt" TIMESTAMP(3),
  ADD COLUMN "lastSoupActionAt" TIMESTAMP(3),
  ADD COLUMN "withdrawnAt" TIMESTAMP(3),
  ADD COLUMN "withdrawalReason" TEXT,
  ADD COLUMN "submissionEvidence" JSONB;

CREATE UNIQUE INDEX "student_applications_applicationKey_key" ON "student_applications"("applicationKey");
CREATE INDEX "student_applications_deadlineAt_status_idx" ON "student_applications"("deadlineAt", "status");
CREATE INDEX "student_applications_assignedStaffUserId_status_idx" ON "student_applications"("assignedStaffUserId", "status");
