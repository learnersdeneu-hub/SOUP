-- Common-App-style "fill once" core profile: structured detail beyond the
-- existing free-text summary fields on student_cases, entered once via
-- /profile/* and reused across every university-specific application.
-- Nullable JSON, matching the existing goals/constraints columns on this
-- same table — additive, low-risk, no data migration needed since every
-- existing row simply has these as NULL until a student fills them in.
-- student_cases already has RLS enabled with no authenticated policies (see
-- 20260913012000_complete_student_scope_rls); adding columns to an
-- already-RLS-enabled table needs no further RLS statements here.
ALTER TABLE "student_cases" ADD COLUMN "coreProfileDetails" JSONB;
ALTER TABLE "student_cases" ADD COLUMN "fundingDetails" JSONB;
ALTER TABLE "student_cases" ADD COLUMN "educationHistory" JSONB;
ALTER TABLE "student_cases" ADD COLUMN "testingDetails" JSONB;
