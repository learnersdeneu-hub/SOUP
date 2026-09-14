CREATE TABLE "ai_rate_limit_counters" (
  "subject" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_rate_limit_counters_pkey" PRIMARY KEY ("subject")
);
