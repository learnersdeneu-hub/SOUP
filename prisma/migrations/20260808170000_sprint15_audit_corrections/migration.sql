-- Sprint 1.5 audit correction: persist explicit Financial report mode.
ALTER TABLE "customer_contexts" ADD COLUMN "financialMode" TEXT;
