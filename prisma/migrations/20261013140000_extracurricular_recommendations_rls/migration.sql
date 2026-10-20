-- Enables Row Level Security on the five tables added by the
-- Extracurricular & Recommendations migration (20261013120000). No
-- policies are added because none are needed: this app reads and writes
-- every table exclusively through Prisma (a direct Postgres connection
-- that bypasses RLS entirely), never through Supabase's PostgREST/
-- client-side query interface — confirmed no supabase.from(...) calls
-- touch any of these tables. Once RLS is enabled with no policy defined,
-- Postgres denies all access via the PostgREST/anon/authenticated roles,
-- which is exactly the intended lockdown — same pattern as migration
-- 20260925060000_enable_rls_all_public_tables. student_activities and
-- recommenders are flagged directly by scripts/rls-coverage-audit.mjs
-- (they carry a profileId column); recommender_assignments,
-- recommendation_letters and application_writing_overrides are included
-- for the same defense-in-depth reason even though that script doesn't
-- check join tables without a direct profileId/userId column.

ALTER TABLE "student_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recommenders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recommender_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recommendation_letters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "application_writing_overrides" ENABLE ROW LEVEL SECURITY;
