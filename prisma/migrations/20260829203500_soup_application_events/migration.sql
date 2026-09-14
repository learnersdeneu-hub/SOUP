CREATE TABLE "student_application_events" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "eventType" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_application_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "student_application_events_applicationId_createdAt_idx" ON "student_application_events"("applicationId", "createdAt");

ALTER TABLE "student_application_events"
ADD CONSTRAINT "student_application_events_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "student_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
