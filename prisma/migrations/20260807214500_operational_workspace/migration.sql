-- Sprint 1 operational workspace: document review status/history.
CREATE TYPE "DocumentReviewStatus" AS ENUM ('UPLOADED', 'PENDING_REVIEW', 'MORE_INFO_REQUIRED', 'APPROVED', 'REJECTED', 'EXPIRED');
CREATE TYPE "DocumentReviewAction" AS ENUM ('SUBMITTED', 'REQUESTED_MORE_INFO', 'APPROVED', 'REJECTED', 'REPLACED', 'EXPIRED');

ALTER TABLE "documents"
  ADD COLUMN "originalFileName" TEXT,
  ADD COLUMN "reviewStatus" "DocumentReviewStatus" NOT NULL DEFAULT 'UPLOADED',
  ADD COLUMN "reviewReason" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "replacementForId" TEXT;

CREATE INDEX "documents_reviewStatus_uploadedAt_idx" ON "documents"("reviewStatus", "uploadedAt");

CREATE TABLE "document_review_events" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" "DocumentReviewAction" NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_review_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "document_review_events_documentId_createdAt_idx" ON "document_review_events"("documentId", "createdAt");
CREATE INDEX "document_review_events_profileId_createdAt_idx" ON "document_review_events"("profileId", "createdAt");

ALTER TABLE "document_review_events" ADD CONSTRAINT "document_review_events_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_review_events" ADD CONSTRAINT "document_review_events_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_review_events" ADD CONSTRAINT "document_review_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
