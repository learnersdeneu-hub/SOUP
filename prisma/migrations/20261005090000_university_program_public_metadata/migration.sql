-- Program-level curated-banner tagging (mirrors University.publicMetadata's
-- { networks: [...] } convention one level down). First use: tagging the
-- specific hospitality/tourism Bachelor's and Master's top-up programs
-- shown in the homepage's hospitality & culinary pathway section, without
-- having to tag (or misrepresent) the entire university as hospitality-only.

ALTER TABLE "university_programs" ADD COLUMN IF NOT EXISTS "publicMetadata" JSONB;
