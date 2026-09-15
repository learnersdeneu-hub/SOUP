CREATE TYPE "CompanionFillOutcome" AS ENUM ('COMPLETED', 'PARTIAL', 'NEEDS_INPUT', 'ERROR');

CREATE TABLE "companion_pairing_codes" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "companion_pairing_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "companion_devices" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "label" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),

  CONSTRAINT "companion_devices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "companion_fill_events" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "portalHost" TEXT NOT NULL,
  "pageUrl" TEXT NOT NULL,
  "fieldsDetected" INTEGER NOT NULL DEFAULT 0,
  "fieldsFilled" INTEGER NOT NULL DEFAULT 0,
  "fieldsNeedInput" INTEGER NOT NULL DEFAULT 0,
  "outcome" "CompanionFillOutcome" NOT NULL DEFAULT 'COMPLETED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "companion_fill_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "companion_pairing_codes_codeHash_key" ON "companion_pairing_codes"("codeHash");
CREATE INDEX "companion_pairing_codes_profileId_createdAt_idx" ON "companion_pairing_codes"("profileId", "createdAt");

CREATE UNIQUE INDEX "companion_devices_tokenHash_key" ON "companion_devices"("tokenHash");
CREATE INDEX "companion_devices_profileId_revokedAt_idx" ON "companion_devices"("profileId", "revokedAt");

CREATE INDEX "companion_fill_events_profileId_createdAt_idx" ON "companion_fill_events"("profileId", "createdAt");
CREATE INDEX "companion_fill_events_deviceId_createdAt_idx" ON "companion_fill_events"("deviceId", "createdAt");

ALTER TABLE "companion_pairing_codes" ADD CONSTRAINT "companion_pairing_codes_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "companion_devices" ADD CONSTRAINT "companion_devices_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "companion_fill_events" ADD CONSTRAINT "companion_fill_events_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "companion_fill_events" ADD CONSTRAINT "companion_fill_events_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "companion_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Defense-in-depth, matching every other profileId-scoped table (see
-- 20260913012000_complete_student_scope_rls): these tables are never queried
-- directly from the browser, only through Prisma in server-side API routes,
-- so RLS is enabled without authenticated policies — direct Supabase data
-- API access is denied by default.
ALTER TABLE "companion_pairing_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "companion_devices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "companion_fill_events" ENABLE ROW LEVEL SECURITY;
