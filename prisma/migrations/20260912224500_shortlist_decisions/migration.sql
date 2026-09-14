ALTER TABLE "university_shortlist_items"
ADD COLUMN "studentDecision" TEXT,
ADD COLUMN "studentDecisionAt" TIMESTAMP(3);

CREATE INDEX "university_shortlist_items_studentDecision_idx"
ON "university_shortlist_items"("studentDecision");
