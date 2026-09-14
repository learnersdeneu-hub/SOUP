CREATE TABLE "customer_contexts" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "facts" JSONB NOT NULL,
  "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_contexts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "customer_contexts_profileId_key" ON "customer_contexts"("profileId");
ALTER TABLE "customer_contexts" ADD CONSTRAINT "customer_contexts_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
