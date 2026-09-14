CREATE TYPE "ReportProductKind" AS ENUM ('FULL_GCI_PACKAGE', 'FINANCIAL_STANDALONE', 'FINANCIAL_INTEGRATED');

CREATE TABLE "report_snapshots" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "kind" "ReportProductKind" NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "content" JSONB NOT NULL,
  "sourceDocumentIds" JSONB NOT NULL,
  "sourceResumeId" TEXT,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "report_snapshots_profileId_kind_generatedAt_idx" ON "report_snapshots"("profileId", "kind", "generatedAt");
ALTER TABLE "report_snapshots" ADD CONSTRAINT "report_snapshots_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
