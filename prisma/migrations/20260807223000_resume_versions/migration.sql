CREATE TABLE "resume_versions" (
  "id" TEXT NOT NULL,
  "resumeId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "template" "ResumeTemplate" NOT NULL,
  "content" JSONB NOT NULL,
  "coverLetter" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "resume_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "resume_versions_resumeId_version_key" ON "resume_versions"("resumeId", "version");
CREATE INDEX "resume_versions_resumeId_createdAt_idx" ON "resume_versions"("resumeId", "createdAt");
ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
