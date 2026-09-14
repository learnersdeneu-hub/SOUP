-- Complete defense-in-depth RLS coverage for every table with a direct profileId/userId field.
-- Prisma remains the trusted server data layer. These tables are not queried directly from the browser,
-- so RLS is enabled without authenticated policies: direct Supabase data API access is denied by default.
-- Existing student-facing direct-access policies live in 20260913003000_direct_access_rls.

ALTER TABLE "credentials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_review_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "org_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consent_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consent_grants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "access_audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "scores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reference_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "timeline_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "data_subject_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "career_goals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customer_contexts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "property_evidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "internal_user_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_cases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "university_shortlists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "counselor_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_referrals" ENABLE ROW LEVEL SECURITY;
