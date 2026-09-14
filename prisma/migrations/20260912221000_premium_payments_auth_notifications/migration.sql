-- SOUP Premium Counseling, payment tracking and payment notifications
CREATE TYPE "PaymentType" AS ENUM ('PREMIUM_COUNSELING', 'UNIVERSITY_APPLICATION_FEE', 'OTHER');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'REQUIRES_ACTION', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT';

CREATE TABLE "payments" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "applicationId" TEXT,
  "type" "PaymentType" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "provider" TEXT,
  "providerSessionId" TEXT,
  "providerPaymentId" TEXT,
  "metadata" JSONB,
  "dueAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payments_providerSessionId_key" ON "payments"("providerSessionId");
CREATE INDEX "payments_profileId_status_createdAt_idx" ON "payments"("profileId", "status", "createdAt");
CREATE INDEX "payments_applicationId_status_idx" ON "payments"("applicationId", "status");
ALTER TABLE "payments" ADD CONSTRAINT "payments_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "student_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
