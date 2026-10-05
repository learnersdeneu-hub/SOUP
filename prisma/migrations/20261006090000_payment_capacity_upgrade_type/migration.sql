-- Backs the hidden (not homepage-advertised) My Colleges capacity add-on:
-- a one-time EUR50 payment that raises a student's tracked-university cap
-- from 3 to 10. See CAPACITY_UPGRADE_* in src/lib/payments/config.ts and
-- effectiveCollegesCap in src/lib/applications/lifecycle.ts.

ALTER TYPE "PaymentType" ADD VALUE IF NOT EXISTS 'CAPACITY_UPGRADE';
