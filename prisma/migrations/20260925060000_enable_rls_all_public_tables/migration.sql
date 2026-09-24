-- Security hardening: enable Row Level Security on every public-schema
-- table that currently has it disabled. Confirmed safe before writing this:
-- grep across src/ for "supabase.from(" returns zero matches — this app
-- reads and writes every one of these tables exclusively through Prisma
-- (a direct Postgres connection that bypasses RLS entirely, unaffected by
-- this change), never through Supabase's PostgREST/client-side query
-- interface. RLS was the only thing standing between these tables and
-- anyone holding the public anon key (shipped in the browser bundle by
-- design) querying them directly via Supabase's REST API.
--
-- No policies are added because none are needed: once RLS is enabled with
-- no policy defined, Postgres defaults to denying all access via
-- PostgREST/anon/authenticated roles, which is exactly the intended
-- lockdown. This mirrors how every profileId/userId-scoped child table in
-- this schema was already protected (see rls-coverage-audit.mjs) — this
-- migration closes the same gap for every table that check doesn't cover:
-- root tables (users), catalogue/reference tables (universities,
-- university_programs, partners), and the various credentialing/scoring
-- subsystem tables from the historical schema.

ALTER TABLE "offer_conditions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "score_bands" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "application_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity_anchors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity_duplicate_flags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity_merge_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity_dispute_cases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credential_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "education_credential_details" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employment_credential_details" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity_credential_details" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financial_credential_details" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credential_flexible_data" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification_sla_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attestations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attestation_standards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attestation_approvals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attestation_revocation_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "org_data_residency_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "case_batches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "case_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consent_policy_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "score_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "scoring_rule_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "score_explanation_factors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "score_narratives" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "score_overrides" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reference_invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reference_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reference_verifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "partners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "universities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "university_programs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_application_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_rate_limit_counters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "university_shortlist_items" ENABLE ROW LEVEL SECURITY;
