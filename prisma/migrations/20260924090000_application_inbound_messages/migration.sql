-- Resend inbound-email webhook support: per-application unique reply
-- address token, and the table that stores each inbound reply as part of
-- that application's communication history. See
-- src/app/api/resend/inbound/route.ts.

ALTER TABLE "student_applications" ADD COLUMN "inboundReplyToken" TEXT;
CREATE UNIQUE INDEX "student_applications_inboundReplyToken_key" ON "student_applications"("inboundReplyToken");

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MESSAGE';

CREATE TABLE "application_messages" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "messageId" TEXT,
    "inReplyTo" TEXT,
    "references" TEXT,
    "fromAddress" TEXT NOT NULL,
    "toAddresses" JSONB NOT NULL,
    "ccAddresses" JSONB,
    "subject" TEXT,
    "textBody" TEXT,
    "htmlBody" TEXT,
    "attachments" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "application_messages_providerEventId_key" ON "application_messages"("providerEventId");
CREATE INDEX "application_messages_applicationId_receivedAt_idx" ON "application_messages"("applicationId", "receivedAt");

ALTER TABLE "application_messages" ADD CONSTRAINT "application_messages_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "student_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
