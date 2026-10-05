-- Adds Portugal to the COTHM hospitality pathway banner (follows
-- 20261005093000_hospitality_pathway_programs for Greece/Italy/Germany).
-- Public institutions only, each verified against the institution's own
-- official program page (research date 2026-10-05). All 3 are Master's --
-- no English-taught Bachelor's hospitality/tourism program exists at any
-- public Portuguese institution (the one confirmed fully-English Bachelor's
-- nationally is at the private Universidade Europeia, out of scope here).
-- A longer list of public Portuguese institutions (ESHTE, IPLeiria's own
-- bachelor's programs, Universidade de Aveiro's tourism Master's, several
-- polytechnics) were researched but left out because their English-taught
-- status could not be confirmed against the official page -- several
-- official .pt domains were unreachable to the research tooling used, so
-- these are flagged for a future direct human check rather than guessed.

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('1a2b3c4d-1111-4e5f-8a9b-000000000001', 'Universidade do Algarve (UAlg)', 'Portugal', 'Faro', 'https://www.ualg.pt', true, '2026-10-05'::timestamp, '{"networks":["GOVERNMENT"]}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = "universities"."publicMetadata" || EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "language", "duration", "sourceUrl", "sourceCheckedAt", "publicMetadata", "active", "createdAt", "updatedAt")
SELECT '1a2b3c4d-1111-4e5f-8a9b-100000000001', "id", 'Tourism Organisations Management', 'Masters', 'English', '2', 'https://www.ualg.pt/en/curso/1466', '2026-10-05'::timestamp, '{"networks":["HOSPITALITY_PATHWAY"]}'::jsonb, true, now(), now()
FROM "universities" WHERE "name" = 'Universidade do Algarve (UAlg)' AND "country" = 'Portugal'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('1a2b3c4d-2222-4e5f-8a9b-000000000002', 'ISCTE – Instituto Universitário de Lisboa', 'Portugal', 'Lisbon', 'https://www.iscte-iul.pt', true, '2026-10-05'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://www.iscte-iul.pt/assets/assets/logos/svg/iscte_main_positive.svg"}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = "universities"."publicMetadata" || EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "language", "duration", "sourceUrl", "sourceCheckedAt", "publicMetadata", "active", "createdAt", "updatedAt")
SELECT '1a2b3c4d-2222-4e5f-8a9b-200000000002', "id", 'Hospitality and Tourism Management', 'Masters', 'English', '2', 'https://ibs.iscte-iul.pt/curso/codigo/027/mestrado-gestao-de-hotelaria-turismo', '2026-10-05'::timestamp, '{"networks":["HOSPITALITY_PATHWAY"]}'::jsonb, true, now(), now()
FROM "universities" WHERE "name" = 'ISCTE – Instituto Universitário de Lisboa' AND "country" = 'Portugal'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('1a2b3c4d-3333-4e5f-8a9b-000000000003', 'Instituto Politécnico de Leiria (IPLeiria)', 'Portugal', 'Peniche', 'https://www.ipleiria.pt', true, '2026-10-05'::timestamp, '{"networks":["GOVERNMENT"]}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = "universities"."publicMetadata" || EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "language", "duration", "sourceUrl", "sourceCheckedAt", "publicMetadata", "active", "createdAt", "updatedAt")
SELECT '1a2b3c4d-3333-4e5f-8a9b-300000000003', "id", 'Sustainable Tourism Management', 'Masters', 'English', '2', 'https://www.ipleiria.pt/en/course/master-in-sustainable-tourism-management/', '2026-10-05'::timestamp, '{"networks":["HOSPITALITY_PATHWAY"]}'::jsonb, true, now(), now()
FROM "universities" WHERE "name" = 'Instituto Politécnico de Leiria (IPLeiria)' AND "country" = 'Portugal'
ON CONFLICT DO NOTHING;
