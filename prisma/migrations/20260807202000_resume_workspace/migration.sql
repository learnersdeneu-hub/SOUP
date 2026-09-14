-- GCI Passport resume workspace and career goals. Additive only.
CREATE TYPE "ResumeTemplate" AS ENUM ('STUDENT', 'GRADUATE', 'PROFESSIONAL', 'INTERNATIONAL_STUDENT', 'JOB_SEEKER');
CREATE TYPE "ResumeStatus" AS ENUM ('DRAFT', 'READY', 'ARCHIVED');
CREATE TYPE "CareerGoalType" AS ENUM ('INTERNSHIP', 'JOB', 'UNIVERSITY', 'SCHOLARSHIP', 'COMPETITION', 'CAREER_GROWTH');

CREATE TABLE "resumes" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'My Resume',
    "template" "ResumeTemplate" NOT NULL,
    "status" "ResumeStatus" NOT NULL DEFAULT 'DRAFT',
    "content" JSONB NOT NULL,
    "coverLetter" TEXT,
    "previewTips" JSONB,
    "sourceFileName" TEXT,
    "sourceMimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "career_goals" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "goalType" "CareerGoalType" NOT NULL,
    "targetTitle" TEXT NOT NULL,
    "targetOrganization" TEXT,
    "targetCountry" TEXT,
    "notes" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "career_goals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "resumes_profileId_updatedAt_idx" ON "resumes"("profileId", "updatedAt");
CREATE INDEX "career_goals_profileId_isPrimary_idx" ON "career_goals"("profileId", "isPrimary");
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "career_goals" ADD CONSTRAINT "career_goals_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
