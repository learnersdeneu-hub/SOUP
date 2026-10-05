-- Hospitality & culinary Bachelor's/Master's top-up pathway programs,
-- sourced for the COTHM (College Of Tourism & Hotel Management, Pakistan)
-- partnership -- diploma graduates continuing into a European degree.
-- Public universities only, English-taught programs only, each verified
-- against the institution's own official program page (research date
-- 2026-10-05). See src/app/page.tsx (hospitalityPrograms query) and
-- src/lib/universities/catalogChannels.ts for how GOVERNMENT and
-- HOSPITALITY_PATHWAY tags are read. Universities are also tagged
-- GOVERNMENT (consistent with the existing Greek public-university
-- partnership) since these are likewise public/government universities in
-- EU countries; the specific program rows additionally carry
-- HOSPITALITY_PATHWAY so the homepage banner can show just the relevant
-- program without implying the whole university is hospitality-focused.
-- A few entries carry real, disclosed caveats rather than being excluded
-- outright: Hochschule Bremen's MBA charges tuition (unlike standard
-- tuition-free German public degrees); Hochschule Stralsund's program is
-- English-primary with a documented partial-German component. Both are
-- genuine, verified hospitality/tourism programs at public institutions,
-- just not textbook-uniform cases. A Naples Federico II bachelor's program
-- was researched but deliberately excluded: its English-taught status
-- could not be confirmed against the university's own page (conflicting
-- third-party claims of only partial English instruction).

-- Tag the two hospitality/tourism programs already on board from the
-- Greek public-university partnership (20260925120000_greek_government_partner_universities).
UPDATE "university_programs" p
SET "publicMetadata" = '{"networks":["HOSPITALITY_PATHWAY"]}'::jsonb
FROM "universities" u
WHERE p."universityId" = u."id"
  AND (
    (u."name" = 'Harokopio University of Athens' AND p."title" = 'Sustainable Tourism Development')
    OR (u."name" = 'International Hellenic University (IHU)' AND p."title" = 'Hospitality & Tourism Management')
  );

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('bcebedfe-5118-4ab9-8fb7-c7b25e2f6330', 'Università Ca'' Foscari Venezia', 'Italy', 'Venice', 'https://www.unive.it', true, '2026-10-05'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://www.unive.it/web/typo3conf/ext/stee_template_b5/Resources/Public/img/logo-unive/CF_moeca_pos_124-min.png"}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = "universities"."publicMetadata" || EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "language", "duration", "sourceUrl", "sourceCheckedAt", "publicMetadata", "active", "createdAt", "updatedAt")
SELECT '078949c3-4610-4cbe-ac34-d303ef082384', "id", 'Hospitality Innovation and e-Tourism', 'Bachelors', 'English', '3', 'https://www.unive.it/degree/ctr9', '2026-10-05'::timestamp, '{"networks":["HOSPITALITY_PATHWAY"]}'::jsonb, true, now(), now()
FROM "universities" WHERE "name" = 'Università Ca'' Foscari Venezia' AND "country" = 'Italy'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "language", "duration", "sourceUrl", "sourceCheckedAt", "publicMetadata", "active", "createdAt", "updatedAt")
SELECT 'b82bfc92-4229-433d-ba70-c95e2bafd215', "id", 'Tourism Management and Sustainability', 'Masters', 'English', '2', 'https://www.unive.it/degree/emr9', '2026-10-05'::timestamp, '{"networks":["HOSPITALITY_PATHWAY"]}'::jsonb, true, now(), now()
FROM "universities" WHERE "name" = 'Università Ca'' Foscari Venezia' AND "country" = 'Italy'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('7e507c32-f1b7-471a-8931-e40989af9d31', 'Università di Bologna (Rimini Campus)', 'Italy', 'Rimini', 'https://www.unibo.it', true, '2026-10-05'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://www.unibo.it/it/++theme++unibotheme.portale/img/header/sigillo1x_xl.png"}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = "universities"."publicMetadata" || EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "language", "duration", "sourceUrl", "sourceCheckedAt", "publicMetadata", "active", "createdAt", "updatedAt")
SELECT '90be5b84-7c0e-47ba-a0e9-f0781d9c3c17', "id", 'Economics of Tourism and Cities', 'Bachelors', 'English', '3', 'https://corsi.unibo.it/1cycle/clet', '2026-10-05'::timestamp, '{"networks":["HOSPITALITY_PATHWAY"]}'::jsonb, true, now(), now()
FROM "universities" WHERE "name" = 'Università di Bologna (Rimini Campus)' AND "country" = 'Italy'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "language", "duration", "sourceUrl", "sourceCheckedAt", "publicMetadata", "active", "createdAt", "updatedAt")
SELECT 'cba89290-6fc5-46f4-a03d-6c97c694e99c', "id", 'Tourism Economics and Management', 'Masters', 'English', '2', 'https://corsi.unibo.it/2cycle/team', '2026-10-05'::timestamp, '{"networks":["HOSPITALITY_PATHWAY"]}'::jsonb, true, now(), now()
FROM "universities" WHERE "name" = 'Università di Bologna (Rimini Campus)' AND "country" = 'Italy'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('78958f2a-68a4-494b-8e81-0f527caf1f28', 'Università degli Studi di Bergamo', 'Italy', 'Bergamo', 'https://www.unibg.it', true, '2026-10-05'::timestamp, '{"networks":["GOVERNMENT"]}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = "universities"."publicMetadata" || EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "language", "duration", "sourceUrl", "sourceCheckedAt", "publicMetadata", "active", "createdAt", "updatedAt")
SELECT 'a613f2a9-d2aa-46d0-bb5b-b72ff7f258f7', "id", 'Planning and Management of Tourism Systems', 'Masters', 'English', '2', 'https://www.unibg.it/studiare/corsi/offertaformativa/planning-and-management-of-tourism-systems', '2026-10-05'::timestamp, '{"networks":["HOSPITALITY_PATHWAY"]}'::jsonb, true, now(), now()
FROM "universities" WHERE "name" = 'Università degli Studi di Bergamo' AND "country" = 'Italy'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('76276e6f-ce09-4d2e-839c-3ca84ab3aeae', 'Università degli Studi di Firenze', 'Italy', 'Florence', 'https://www.unifi.it', true, '2026-10-05'::timestamp, '{"networks":["GOVERNMENT"]}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = "universities"."publicMetadata" || EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "language", "duration", "sourceUrl", "sourceCheckedAt", "publicMetadata", "active", "createdAt", "updatedAt")
SELECT 'ad5e5bc8-de68-4032-a8d3-b3cd4a943a7b', "id", 'Design of Sustainable Tourism Systems', 'Masters', 'English', '2', 'https://www.unifi.it/en/study-us/degree-programs/second-cycle-degree/design-sustainable-tourism-systems', '2026-10-05'::timestamp, '{"networks":["HOSPITALITY_PATHWAY"]}'::jsonb, true, now(), now()
FROM "universities" WHERE "name" = 'Università degli Studi di Firenze' AND "country" = 'Italy'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('2f62c7e8-5e22-40e6-b058-a117991a33a0', 'Università degli Studi di Torino (Biella Campus)', 'Italy', 'Biella', 'https://www.unito.it', true, '2026-10-05'::timestamp, '{"networks":["GOVERNMENT"]}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = "universities"."publicMetadata" || EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "language", "duration", "sourceUrl", "sourceCheckedAt", "publicMetadata", "active", "createdAt", "updatedAt")
SELECT '2f49301d-048a-4b16-bf80-8175df91d38d', "id", 'Cultural Heritage and Creativity for Tourism and Territorial Development', 'Masters', 'English', '2', 'https://www.unito.it/didattica/offerta-formativa/corsi-di-studio/cultural-heritage-and-creativity-tourism-and', '2026-10-05'::timestamp, '{"networks":["HOSPITALITY_PATHWAY"]}'::jsonb, true, now(), now()
FROM "universities" WHERE "name" = 'Università degli Studi di Torino (Biella Campus)' AND "country" = 'Italy'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('98086023-04b4-490a-b4c9-177ceaf87ee0', 'Università degli Studi di Palermo', 'Italy', 'Palermo', 'https://www.unipa.it', true, '2026-10-05'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://www.unipa.it/.content/immagini/hp_new/logo-unipa-2023.png"}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = "universities"."publicMetadata" || EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "language", "duration", "sourceUrl", "sourceCheckedAt", "publicMetadata", "active", "createdAt", "updatedAt")
SELECT '3021baca-c91c-433c-bb4b-81e742f67b29', "id", 'Tourism Systems and Hospitality Management', 'Masters', 'English', '2', 'https://www.unipa.it/dipartimenti/seas/cds/tourismsystemsandhospitalitymanagement2205', '2026-10-05'::timestamp, '{"networks":["HOSPITALITY_PATHWAY"]}'::jsonb, true, now(), now()
FROM "universities" WHERE "name" = 'Università degli Studi di Palermo' AND "country" = 'Italy'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('88357274-d5b4-44b9-8b53-c18abcdd666e', 'Università degli Studi di Macerata', 'Italy', 'Macerata', 'https://www.unimc.it', true, '2026-10-05'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://www.unimc.it/@@site-logo/logo_unimc_dal1290.png"}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = "universities"."publicMetadata" || EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "language", "duration", "sourceUrl", "sourceCheckedAt", "publicMetadata", "active", "createdAt", "updatedAt")
SELECT '9208cc04-2ebb-4a24-8682-7a8e61844a0b', "id", 'International Tourism and Destination Management (ITourDeM)', 'Masters', 'English', '2', 'https://corsi.unimc.it/en/international-tourism-destination-management/course', '2026-10-05'::timestamp, '{"networks":["HOSPITALITY_PATHWAY"]}'::jsonb, true, now(), now()
FROM "universities" WHERE "name" = 'Università degli Studi di Macerata' AND "country" = 'Italy'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('c4e8bd4b-3f66-450d-8ab2-ef1e5abecc99', 'Hochschule Bremerhaven', 'Germany', 'Bremerhaven', 'https://www.hs-bremerhaven.de', true, '2026-10-05'::timestamp, '{"networks":["GOVERNMENT"]}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = "universities"."publicMetadata" || EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "language", "duration", "sourceUrl", "sourceCheckedAt", "publicMetadata", "active", "createdAt", "updatedAt")
SELECT 'b2e840d2-78f6-44e7-8c9b-316a4e58d3a2', "id", 'International Tourism Management (Cruise Business/Innovation)', 'Bachelors', 'English', '4', 'https://www.hs-bremerhaven.de/International-Tourism-Management-Cruise-Business-Innovation', '2026-10-05'::timestamp, '{"networks":["HOSPITALITY_PATHWAY"]}'::jsonb, true, now(), now()
FROM "universities" WHERE "name" = 'Hochschule Bremerhaven' AND "country" = 'Germany'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('9b3977e7-e927-4b3b-9bae-ced6709c92e3', 'Technische Hochschule Deggendorf (European Campus Rottal-Inn)', 'Germany', 'Pfarrkirchen', 'https://www.th-deg.de', true, '2026-10-05'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://www.th-deg.de/static/images/redesign/logos/dit-logo-grau.svg"}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = "universities"."publicMetadata" || EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "language", "duration", "sourceUrl", "sourceCheckedAt", "publicMetadata", "active", "createdAt", "updatedAt")
SELECT '84ab26e9-d13a-48c7-a4b0-e0823c7af270', "id", 'International Tourism Management / Health & Medical Tourism', 'Bachelors', 'English', '3.5', 'https://www.th-deg.de/itm-b-en', '2026-10-05'::timestamp, '{"networks":["HOSPITALITY_PATHWAY"]}'::jsonb, true, now(), now()
FROM "universities" WHERE "name" = 'Technische Hochschule Deggendorf (European Campus Rottal-Inn)' AND "country" = 'Germany'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('e148cd21-5cdc-4d62-a03e-75888c4a3140', 'Fachhochschule Westküste', 'Germany', 'Heide', 'https://www.fh-westkueste.de', true, '2026-10-05'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://www.fh-westkueste.de/fileadmin/templates/gfx/FH-Westkueste_Logo_final_DE_positiv_4c_Schutzzone.png"}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = "universities"."publicMetadata" || EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "language", "duration", "sourceUrl", "sourceCheckedAt", "publicMetadata", "active", "createdAt", "updatedAt")
SELECT '617cc4fa-4ebb-4d8e-aad5-5ef34f8579aa', "id", 'International Tourism Management', 'Masters', 'English', '2', 'https://willkommen.fh-westkueste.de/en/international-tourism-management-ma', '2026-10-05'::timestamp, '{"networks":["HOSPITALITY_PATHWAY"]}'::jsonb, true, now(), now()
FROM "universities" WHERE "name" = 'Fachhochschule Westküste' AND "country" = 'Germany'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('6220dce3-bc11-49ce-8995-a04c28b5367a', 'Hochschule Heilbronn', 'Germany', 'Heilbronn', 'https://www.hs-heilbronn.de', true, '2026-10-05'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://www.hs-heilbronn.de/assets/logo_color_de.1d2df2ddaca26921d4f3.png"}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = "universities"."publicMetadata" || EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "language", "duration", "sourceUrl", "sourceCheckedAt", "publicMetadata", "active", "createdAt", "updatedAt")
SELECT '21175b1d-4a84-4186-a6be-483cbb5b9922', "id", 'Tourism Futures Studies', 'Masters', 'English', '1.5', 'https://www.hs-heilbronn.de/en/why-tfs-6a3886d9d01330cd', '2026-10-05'::timestamp, '{"networks":["HOSPITALITY_PATHWAY"]}'::jsonb, true, now(), now()
FROM "universities" WHERE "name" = 'Hochschule Heilbronn' AND "country" = 'Germany'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('9f4cb2f0-4940-433f-bf39-7a09e41be492', 'Eberswalde University for Sustainable Development (HNEE)', 'Germany', 'Eberswalde', 'https://www.hnee.de/en/', true, '2026-10-05'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://www.hnee.de/_assets/afda9b37bbbb38d3e0a775c098bcb126/Icons/Logo/White/logo-en.svg"}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = "universities"."publicMetadata" || EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "language", "duration", "sourceUrl", "sourceCheckedAt", "publicMetadata", "active", "createdAt", "updatedAt")
SELECT '575f570c-6e3b-4164-848d-21c126066242', "id", 'Sustainable Tourism Management', 'Masters', 'English', '2', 'https://www.hnee.de/en/studies/master/sustainable-tourism-management', '2026-10-05'::timestamp, '{"networks":["HOSPITALITY_PATHWAY"]}'::jsonb, true, now(), now()
FROM "universities" WHERE "name" = 'Eberswalde University for Sustainable Development (HNEE)' AND "country" = 'Germany'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('37bb6405-bb63-4b7f-985a-3409842134ee', 'Hochschule Bremen (International Graduate Center)', 'Germany', 'Bremen', 'https://www.hs-bremen.de', true, '2026-10-05'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://www.hs-bremen.de/_assets/f33b63229ca06ac40890a7fe3cae94cd/Frontend/Build/assets/images/logo_hsb_startseite.svg"}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = "universities"."publicMetadata" || EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "language", "duration", "sourceUrl", "sourceCheckedAt", "publicMetadata", "active", "createdAt", "updatedAt")
SELECT '1ddaceaa-22d8-4097-a3f2-86b85a1e3f3c', "id", 'International Tourism Management (MBA)', 'Masters', 'English', '1.5', 'https://www.hs-bremen.de/en/study/degree-programme/international-tourism-management-mba/', '2026-10-05'::timestamp, '{"networks":["HOSPITALITY_PATHWAY"]}'::jsonb, true, now(), now()
FROM "universities" WHERE "name" = 'Hochschule Bremen (International Graduate Center)' AND "country" = 'Germany'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('6d06cdcc-746f-4d7a-af15-878cf6929a12', 'Hochschule Stralsund', 'Germany', 'Stralsund', 'https://www.hochschule-stralsund.de/en/', true, '2026-10-05'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://www.hochschule-stralsund.de/_assets/352f16d28f29cecf1d1a1ba234e9a992/Images/host-logo.svg"}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = "universities"."publicMetadata" || EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "language", "duration", "sourceUrl", "sourceCheckedAt", "publicMetadata", "active", "createdAt", "updatedAt")
SELECT '50e00877-bdeb-4c27-8963-997ec01e8f01', "id", 'Tourism Development Strategies', 'Masters', 'English (primary), partial German', '2-4', 'https://www.hochschule-stralsund.de/en/host/schools/business-studies/study-programmes/tourism-development-strategies/', '2026-10-05'::timestamp, '{"networks":["HOSPITALITY_PATHWAY"]}'::jsonb, true, now(), now()
FROM "universities" WHERE "name" = 'Hochschule Stralsund' AND "country" = 'Germany'
ON CONFLICT DO NOTHING;
