-- Adds outbound (staff reply) support to application_messages, which
-- previously only ever stored inbound student replies. See
-- src/app/actions/adminMessages.ts (sendApplicationReply) and the new
-- admin inbox at /admin/messages.

CREATE TYPE "ApplicationMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

ALTER TABLE "application_messages" ADD COLUMN "direction" "ApplicationMessageDirection" NOT NULL DEFAULT 'INBOUND';
ALTER TABLE "application_messages" ADD COLUMN "sentByUserId" TEXT;

ALTER TABLE "application_messages" ADD CONSTRAINT "application_messages_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
