CREATE TABLE "property_evidence" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "propertyLabel" TEXT,
  "country" TEXT,
  "addressText" TEXT,
  "documentStatedValue" TEXT,
  "currency" TEXT,
  "ownershipNames" JSONB,
  "extractedFacts" JSONB NOT NULL,
  "valuationStatus" TEXT NOT NULL DEFAULT 'EVIDENCE_ONLY',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "property_evidence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "property_evidence_documentId_key" ON "property_evidence"("documentId");
CREATE INDEX "property_evidence_profileId_updatedAt_idx" ON "property_evidence"("profileId", "updatedAt");
ALTER TABLE "property_evidence" ADD CONSTRAINT "property_evidence_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "property_evidence" ADD CONSTRAINT "property_evidence_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
