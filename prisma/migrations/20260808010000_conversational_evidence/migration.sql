CREATE TYPE "EvidenceProcessingStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETE', 'FAILED');

ALTER TABLE "documents"
  ADD COLUMN "processingStatus" "EvidenceProcessingStatus" NOT NULL DEFAULT 'QUEUED',
  ADD COLUMN "aiAnalysis" JSONB,
  ADD COLUMN "aiProcessedAt" TIMESTAMP(3),
  ADD COLUMN "processingError" TEXT,
  ADD COLUMN "sourceWorkflow" "ChatWorkflow";

CREATE INDEX "documents_profileId_processingStatus_idx" ON "documents"("profileId", "processingStatus");
