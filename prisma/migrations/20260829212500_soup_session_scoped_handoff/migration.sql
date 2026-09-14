-- SOUP human Counselor handoff belongs to one exact chat thread.
-- StudentCase retains its earlier aggregate fields for migration compatibility, but runtime handoff state is session-scoped.
ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "humanHandoffActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "assignedStaffUserId" TEXT;
ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "handoffReason" TEXT;
ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "handoffStartedAt" TIMESTAMP(3);
