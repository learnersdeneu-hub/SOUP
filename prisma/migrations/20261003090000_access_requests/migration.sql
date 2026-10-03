-- Students can no longer self-register. This table backs the public
-- "request access" form (replaces self-serve /sign-up) and the staff
-- review queue at /admin/access-requests. See the approval gate added to
-- ensureUserAndProfile in src/lib/auth/provision.ts, which blocks creating
-- a new users/profiles row unless a matching AccessRequest is APPROVED.

CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

CREATE TABLE "access_requests" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "access_requests_email_idx" ON "access_requests"("email");
CREATE INDEX "access_requests_status_idx" ON "access_requests"("status");

ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "access_requests" ENABLE ROW LEVEL SECURITY;
