-- GCI Passport foundation: app roles, support tickets, notifications and internal notes.
-- Additive only. Existing Core tables/data are preserved.

CREATE TYPE "AppRole" AS ENUM ('CUSTOMER', 'SUPPORT', 'ADMIN');
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED');
CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "NotificationType" AS ENUM ('ACCOUNT', 'DOCUMENT', 'VERIFICATION', 'REPORT', 'SUPPORT', 'SYSTEM');

ALTER TABLE "users" ADD COLUMN "role" "AppRole" NOT NULL DEFAULT 'CUSTOMER';
CREATE INDEX "users_role_idx" ON "users"("role");

CREATE TABLE "support_tickets" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "customerUserId" TEXT NOT NULL,
  "assignedToUserId" TEXT,
  "subject" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "SupportTicketPriority" NOT NULL DEFAULT 'NORMAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "support_tickets_profileId_status_idx" ON "support_tickets"("profileId", "status");
CREATE INDEX "support_tickets_assignedToUserId_status_idx" ON "support_tickets"("assignedToUserId", "status");
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "support_ticket_messages" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "isInternal" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "support_ticket_messages_ticketId_createdAt_idx" ON "support_ticket_messages"("ticketId", "createdAt");
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "href" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_profileId_readAt_createdAt_idx" ON "notifications"("profileId", "readAt", "createdAt");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "internal_user_notes" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "authoredById" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "internal_user_notes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "internal_user_notes_profileId_createdAt_idx" ON "internal_user_notes"("profileId", "createdAt");
ALTER TABLE "internal_user_notes" ADD CONSTRAINT "internal_user_notes_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "internal_user_notes" ADD CONSTRAINT "internal_user_notes_authoredById_fkey" FOREIGN KEY ("authoredById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
