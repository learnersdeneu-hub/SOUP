-- Seeds SOUP's first government partnership: 23 Greek public
-- universities with English-taught programmes, sourced from Greece's
-- official Study in Greece / AtSiG network (research date 2026-09-23).
-- Tagged with publicMetadata.networks = ["GOVERNMENT"] rather than a
-- Partner row -- see src/lib/universities/catalogChannels.ts for why the
-- GOVERNMENT channel is a metadata tag, not a partnerId relationship.
-- Fee figures are the sheet's own "indicative avg" estimates, not
-- confirmed live tuition -- sourceCheckedAt is set so the existing
-- verification-freshness UI treats them the same as any other
-- catalogue entry due for a live Noodles check, not as exempt from it.

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceUrl", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('144da799-a63c-4617-a814-07995c05cf83', 'National and Kapodistrian University of Athens (NKUA)', 'Greece', 'Athens', 'https://uoa.gr', true, 'https://apply.studyingreece.edu.gr/en/universities/10/details', '2026-09-23'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://en.uoa.gr/fileadmin/user_upload/Banners/190_logo_UOA_CYAN_left_ENG_w322.png","indicativeAvgBachelorFeeEUR":10667,"indicativeAvgMasterFeeEUR":3320,"englishTaughtLevels":"Bachelor''s + Master''s","acceptsInternationalStudents":true}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceUrl" = EXCLUDED."sourceUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '224c64f0-f209-4a39-b88a-f8138e4c7fe4', "id", 'Medical Degree', 'Bachelors', 10667, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/10/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'National and Kapodistrian University of Athens (NKUA)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'ab6b033c-5b15-4ec4-8ed3-1e395e87a052', "id", 'BA Archaeology, History & Literature', 'Bachelors', 10667, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/10/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'National and Kapodistrian University of Athens (NKUA)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '747c9aba-5de3-43aa-a776-7b7389a88cf5', "id", 'Integrated Master Pharmacy', 'Masters', 3320, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/10/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'National and Kapodistrian University of Athens (NKUA)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'f9979305-9120-460e-bb0c-ab2645e330bb', "id", 'Athens MA Ancient Philosophy', 'Unknown', 3320, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/10/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'National and Kapodistrian University of Athens (NKUA)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '8a9b97de-f8ab-432a-959d-583c8e2ee654', "id", 'Digital Humanities', 'Unknown', 3320, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/10/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'National and Kapodistrian University of Athens (NKUA)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'e404856e-3e89-4f28-a1a1-3eb653f657a9', "id", 'Archaeological Science', 'Unknown', 3320, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/10/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'National and Kapodistrian University of Athens (NKUA)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceUrl", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('58af1422-e88e-493a-ad71-a41431c8961e', 'National Technical University of Athens (NTUA)', 'Greece', 'Athens', 'https://ntua.gr', true, 'https://apply.studyingreece.edu.gr/en/universities/11/details/national-technical-university-of-athens', '2026-09-23'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://www.ntua.gr/images/logos/logo.jpg","indicativeAvgBachelorFeeEUR":null,"indicativeAvgMasterFeeEUR":1250,"englishTaughtLevels":"Master''s","acceptsInternationalStudents":true}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceUrl" = EXCLUDED."sourceUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'dc5ebb87-7d0e-42e8-bc18-00ee714bb187', "id", 'Environment & Development', 'Masters', 1250, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/11/details/national-technical-university-of-athens', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'National Technical University of Athens (NTUA)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '51af1d34-07a6-4c71-8eb8-8a8cf0961b67', "id", 'Geoinformatics', 'Masters', 1250, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/11/details/national-technical-university-of-athens', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'National Technical University of Athens (NTUA)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '1c3af1b3-84be-49db-85ac-f082b019757d', "id", 'Analysis & Design of Structures', 'Masters', 1250, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/11/details/national-technical-university-of-athens', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'National Technical University of Athens (NTUA)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '125078d8-22a2-48fa-95f0-a74cac829416', "id", 'Ship & Marine Technology', 'Masters', 1250, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/11/details/national-technical-university-of-athens', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'National Technical University of Athens (NTUA)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'e5134623-31af-48e8-8d5a-7b79bf86dfa7', "id", 'Microsystems & Nanodevices', 'Masters', 1250, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/11/details/national-technical-university-of-athens', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'National Technical University of Athens (NTUA)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '8ee47e46-3d87-4ef9-ac6b-54ec853383e4', "id", 'Automation Systems', 'Masters', 1250, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/11/details/national-technical-university-of-athens', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'National Technical University of Athens (NTUA)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceUrl", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('16dd8b95-f822-4afc-8193-6a2d54990015', 'Athens University of Economics and Business (AUEB)', 'Greece', 'Athens', 'https://aueb.gr', true, 'https://apply.studyingreece.edu.gr/en/programmes/bsc/1718/details', '2026-09-23'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://www.aueb.gr/newopa/icons/menu/logo_opa.png","indicativeAvgBachelorFeeEUR":6000,"indicativeAvgMasterFeeEUR":9700,"englishTaughtLevels":"Bachelor''s + Master''s","acceptsInternationalStudents":true}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceUrl" = EXCLUDED."sourceUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '9d6dd111-d4b2-46ff-8165-7f523909af3b', "id", 'BSc International Business & Technology', 'Bachelors', 6000, 'EUR', 'https://apply.studyingreece.edu.gr/en/programmes/bsc/1718/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Athens University of Economics and Business (AUEB)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '735eee7d-101e-49c6-b62b-2f361ecf282d', "id", 'MBA International', 'Masters', 9700, 'EUR', 'https://apply.studyingreece.edu.gr/en/programmes/bsc/1718/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Athens University of Economics and Business (AUEB)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceUrl", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('751e7b8f-3674-408d-9c7d-6f6bcd8578ad', 'Agricultural University of Athens', 'Greece', 'Athens', 'https://aua.gr', true, 'https://apply.studyingreece.edu.gr/en/universities/7/details', '2026-09-23'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://www2.aua.gr/sites/default/files/contentpage_attachedfiles/gpa_logo_web_430x80.png","indicativeAvgBachelorFeeEUR":null,"indicativeAvgMasterFeeEUR":3583,"englishTaughtLevels":"Master''s","acceptsInternationalStudents":true}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceUrl" = EXCLUDED."sourceUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '69ea7916-6e25-4a4d-9601-dc5723c3b888', "id", 'SUSTAGRI', 'Masters', 3583, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/7/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Agricultural University of Athens' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '31520048-2d15-4e1c-8b7d-c2c245dec6f8', "id", 'Marine Biotechnology', 'Masters', 3583, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/7/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Agricultural University of Athens' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '8f022bef-ebb2-4052-bf70-95f8a5209f83', "id", 'Digital Technologies & Smart Infrastructure in Agriculture', 'Masters', 3583, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/7/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Agricultural University of Athens' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceUrl", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('8cabb33d-23da-4dfa-993d-9fe8377a715a', 'Aristotle University of Thessaloniki (AUTH)', 'Greece', 'Thessaloniki', 'https://auth.gr', true, 'https://apply.studyingreece.edu.gr/en/universities/5/details', '2026-09-23'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://www.auth.gr/wp-content/uploads/LogoAUTH300ppi.png","indicativeAvgBachelorFeeEUR":7000,"indicativeAvgMasterFeeEUR":null,"englishTaughtLevels":"Bachelor''s + Master''s","acceptsInternationalStudents":true}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceUrl" = EXCLUDED."sourceUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '73a381ce-df51-41e5-a925-937507212988', "id", 'Sustainable Agriculture & Food Science', 'Unknown', 7000, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/5/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Aristotle University of Thessaloniki (AUTH)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'b6e59af1-519b-4710-9b03-99848840e216', "id", 'Clean Energy Science & Engineering', 'Unknown', 7000, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/5/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Aristotle University of Thessaloniki (AUTH)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'f81d4c6a-b3e2-4a0d-a608-d2384ad81128', "id", 'Environmental Sciences & Engineering', 'Unknown', 7000, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/5/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Aristotle University of Thessaloniki (AUTH)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '66034c65-6997-488f-8ceb-ed0fad4c1c51', "id", 'Materials Science & Engineering', 'Unknown', 7000, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/5/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Aristotle University of Thessaloniki (AUTH)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '13fbdfdd-38c4-44f9-bd45-de07e9f00410', "id", 'LL.B.', 'Unknown', 7000, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/5/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Aristotle University of Thessaloniki (AUTH)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '7fd3d00c-8199-4a71-aca9-dab3263e6f9f', "id", 'Sport & Exercise Sciences', 'Unknown', 7000, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/5/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Aristotle University of Thessaloniki (AUTH)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceUrl", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('5e7ae151-0407-4242-a839-3c1a8c0f71c3', 'Panteion University of Social and Political Sciences', 'Greece', 'Athens', 'https://panteion.gr', true, 'https://apply.studyingreece.edu.gr/en/universities/26/details/panteion-university-of-social-and-political-sciences', '2026-09-23'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://www.panteion.gr/wp-content/uploads/2026/02/logo-panteion.png","indicativeAvgBachelorFeeEUR":null,"indicativeAvgMasterFeeEUR":5500,"englishTaughtLevels":"Master''s","acceptsInternationalStudents":true}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceUrl" = EXCLUDED."sourceUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '35a6792d-b054-4d30-9586-36a8a29e5e73', "id", 'MA Digital Transformation: e-Diplomacy, e-Campaigning & Digital Law (non-EU fee used)', 'Masters', 5500, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/26/details/panteion-university-of-social-and-political-sciences', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Panteion University of Social and Political Sciences' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceUrl", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('d7d5d59c-44b4-4814-acbb-2067b972b304', 'University of Piraeus', 'Greece', 'Piraeus (Athens metro)', 'https://unipi.gr', true, 'https://apply.studyingreece.edu.gr/en/universities/24/details/panepistimio-peiraios', '2026-09-23'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://thumb.wikimedia.org/wikipedia/en/thumb/9/93/UNIPI_logo.png/330px-UNIPI_logo.png","indicativeAvgBachelorFeeEUR":null,"indicativeAvgMasterFeeEUR":4000,"englishTaughtLevels":"Master''s","acceptsInternationalStudents":true}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceUrl" = EXCLUDED."sourceUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '2474f600-d781-404f-b3c2-3afa01742b0f', "id", 'Advanced Cybersecurity Technologies & Governance', 'Masters', 4000, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/24/details/panepistimio-peiraios', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Piraeus' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '1552be08-9d16-43c8-a934-24b5f0e45eee', "id", 'Financial Technology (FinTech)', 'Masters', 4000, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/24/details/panepistimio-peiraios', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Piraeus' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceUrl", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('bdc191f1-4548-4862-8c25-4021f656f87f', 'University of West Attica', 'Greece', 'Athens', 'https://uniwa.gr', true, 'https://apply.studyingreece.edu.gr/en/programmes/bsc/1724/details/artificial-intelligence-and-data-science', '2026-09-23'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://16836c80.delivery.rocketcdn.me/wp-content/uploads/2018/11/logo-pada.png","indicativeAvgBachelorFeeEUR":6000,"indicativeAvgMasterFeeEUR":3188,"englishTaughtLevels":"Bachelor''s + Master''s","acceptsInternationalStudents":true}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceUrl" = EXCLUDED."sourceUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'a030f75b-7e06-4200-87b1-8ab6502f7e15', "id", 'BSc Artificial Intelligence & Data Science', 'Bachelors', 6000, 'EUR', 'https://apply.studyingreece.edu.gr/en/programmes/bsc/1724/details/artificial-intelligence-and-data-science', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of West Attica' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'f96d8119-4391-4247-9464-db0aba705f38', "id", 'BA Applied Philosophy in Business Decision Making', 'Bachelors', 6000, 'EUR', 'https://apply.studyingreece.edu.gr/en/programmes/bsc/1724/details/artificial-intelligence-and-data-science', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of West Attica' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'e7cbf8b5-ad20-44f8-92dd-54eb7035d892', "id", 'Circular Economy', 'Unknown', 3188, 'EUR', 'https://apply.studyingreece.edu.gr/en/programmes/bsc/1724/details/artificial-intelligence-and-data-science', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of West Attica' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '15fd9f93-6630-4898-8d47-07c58d4728aa', "id", 'AI & Visual Computing', 'Unknown', 3188, 'EUR', 'https://apply.studyingreece.edu.gr/en/programmes/bsc/1724/details/artificial-intelligence-and-data-science', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of West Attica' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '58265761-d822-4b0f-918b-f4fab1d30048', "id", 'Biomedical Engineering', 'Unknown', 3188, 'EUR', 'https://apply.studyingreece.edu.gr/en/programmes/bsc/1724/details/artificial-intelligence-and-data-science', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of West Attica' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '9850be8f-9ee2-4303-891f-877ed1c2c6e2', "id", 'AI & Deep Learning', 'Unknown', 3188, 'EUR', 'https://apply.studyingreece.edu.gr/en/programmes/bsc/1724/details/artificial-intelligence-and-data-science', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of West Attica' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceUrl", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('dbc3acfd-f9aa-49fa-8a5f-509cee52e2b1', 'Harokopio University of Athens', 'Greece', 'Athens', 'https://hua.gr', true, 'https://apply.studyingreece.edu.gr/en/universities/29/details/harokopio-university-of-athens', '2026-09-23'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://upload.wikimedia.org/wikipedia/en/thumb/9/93/Harokopio_Logo.png/330px-Harokopio_Logo.png","indicativeAvgBachelorFeeEUR":null,"indicativeAvgMasterFeeEUR":3538,"englishTaughtLevels":"Master''s","acceptsInternationalStudents":true}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceUrl" = EXCLUDED."sourceUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'a192e5dd-1984-4261-89bb-408b6307ef07', "id", 'Sustainable Tourism Development', 'Masters', 3538, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/29/details/harokopio-university-of-athens', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Harokopio University of Athens' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'ec466eb7-8ad2-406e-b56a-06343d133696', "id", 'Advances in Computer Science & Information Systems', 'Masters', 3538, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/29/details/harokopio-university-of-athens', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Harokopio University of Athens' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceUrl", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('4de38a91-73f0-45ad-a8f4-8df6f0db7ec4', 'University of Macedonia', 'Greece', 'Thessaloniki', 'https://uom.gr', true, 'https://apply.studyingreece.edu.gr/en/universities/22/details/university-of-macedonia', '2026-09-23'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://thumb.wikimedia.org/wikipedia/en/thumb/0/01/University_of_Macedonia_logo.svg/250px-University_of_Macedonia_logo.svg.png","indicativeAvgBachelorFeeEUR":5900,"indicativeAvgMasterFeeEUR":4550,"englishTaughtLevels":"Bachelor''s + Master''s","acceptsInternationalStudents":true}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceUrl" = EXCLUDED."sourceUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '4e44ca23-c4df-49af-bcae-c618e89365c7', "id", 'BSc Accounting & Finance', 'Bachelors', 5900, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/22/details/university-of-macedonia', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Macedonia' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'ba0ca9a6-5199-4dcf-adf9-c2d0682174eb', "id", 'Shipping & Sea Transports', 'Unknown', 4550, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/22/details/university-of-macedonia', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Macedonia' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '046de2fe-c414-45db-8815-879e9df07cc5', "id", 'Human Rights & Migration Studies', 'Unknown', 4550, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/22/details/university-of-macedonia', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Macedonia' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceUrl", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('029033f6-47b6-4328-8cd3-0c5313f4c028', 'International Hellenic University (IHU)', 'Greece', 'Thessaloniki / Northern Greece', 'https://ihu.gr', true, 'https://apply.studyingreece.edu.gr/en/universities/9/details/international-hellenic-university', '2026-09-23'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://www.ihu.gr/wp-content/uploads/2024/01/ihu-gr-logo-created17m519.png","indicativeAvgBachelorFeeEUR":null,"indicativeAvgMasterFeeEUR":4133,"englishTaughtLevels":"Master''s","acceptsInternationalStudents":true}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceUrl" = EXCLUDED."sourceUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'b9edf655-7176-410c-ada0-3446ef0f8ce1', "id", 'Hospitality & Tourism Management', 'Masters', 4133, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/9/details/international-hellenic-university', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'International Hellenic University (IHU)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '7075535f-9e4c-41dc-8d3a-d3da55a4117c', "id", 'International Accounting', 'Masters', 4133, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/9/details/international-hellenic-university', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'International Hellenic University (IHU)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '9704a43a-b805-4667-89b0-d305c82c7993', "id", 'Management', 'Masters', 4133, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/9/details/international-hellenic-university', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'International Hellenic University (IHU)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '645cbe18-1983-492e-97e4-b0d67f8aa114', "id", 'FinTech & Risk', 'Masters', 4133, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/9/details/international-hellenic-university', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'International Hellenic University (IHU)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '83de590b-4d96-4879-9d86-4efc1e9004a0', "id", 'Executive MBA', 'Masters', 4133, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/9/details/international-hellenic-university', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'International Hellenic University (IHU)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '29cc47a4-60b8-43b1-a13d-00d6524f13dc', "id", 'Humanitarian Logistics', 'Masters', 4133, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/9/details/international-hellenic-university', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'International Hellenic University (IHU)' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceUrl", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('84b463c0-7ac6-4757-a9ed-e782e8cf6560', 'Democritus University of Thrace', 'Greece', 'Komotini / Alexandroupoli / Xanthi', 'https://duth.gr', true, 'https://apply.studyingreece.edu.gr/en/universities/8/details', '2026-09-23'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://duth.gr/wp-content/uploads/2025/04/dimokriteio_logo_gr-en.png","indicativeAvgBachelorFeeEUR":null,"indicativeAvgMasterFeeEUR":3700,"englishTaughtLevels":"Master''s","acceptsInternationalStudents":true}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceUrl" = EXCLUDED."sourceUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '90ac0750-0c4c-4478-8c41-3eb69b879f79', "id", 'Quantum Computing', 'Masters', 3700, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/8/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Democritus University of Thrace' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '3ca7d8a1-e9d8-416f-b293-d4e22fea432e', "id", 'Biomedical & Molecular Sciences', 'Masters', 3700, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/8/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Democritus University of Thrace' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '49c2e55f-781b-4332-927d-1f0dfc475250', "id", 'Intelligent Transportation Electrification', 'Masters', 3700, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/8/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Democritus University of Thrace' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'fb786873-404c-47e1-b1d9-7216207b8913', "id", 'LLM International Studies', 'Masters', 3700, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/8/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Democritus University of Thrace' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceUrl", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('f8320428-64b0-453c-a5ee-6f55e770f223', 'University of Thessaly', 'Greece', 'Volos / Larissa / Central Greece', 'https://uth.gr', true, 'https://apply.studyingreece.edu.gr/en/universities/19/details/university-of-thessaly', '2026-09-23'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://www.uth.gr/sites/default/files/UTH_LOGO_30YEARS_COLOR_EN.png","indicativeAvgBachelorFeeEUR":12000,"indicativeAvgMasterFeeEUR":5040,"englishTaughtLevels":"Bachelor''s + Master''s","acceptsInternationalStudents":true}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceUrl" = EXCLUDED."sourceUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '59aaa4c7-3416-4224-9b2d-2a6e5958e610', "id", 'Medical Degree', 'Bachelors', 12000, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/19/details/university-of-thessaly', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Thessaly' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'd23dfffb-f6da-468b-a6a8-e6f300337006', "id", 'Vascular Ultrasound', 'Unknown', 5040, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/19/details/university-of-thessaly', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Thessaly' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'bf329452-83d3-483e-a86c-27588263cedc', "id", 'Public Health & Epidemiology', 'Unknown', 5040, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/19/details/university-of-thessaly', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Thessaly' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '2765e0ee-c74a-4fb6-8a94-09a82f3246fb', "id", 'Lifestyle Medicine', 'Unknown', 5040, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/19/details/university-of-thessaly', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Thessaly' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '34e789bd-b2bf-4040-9739-867501d16c22', "id", 'Advanced Biosciences', 'Unknown', 5040, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/19/details/university-of-thessaly', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Thessaly' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'e9a3d627-d945-4e2b-b55e-dab44993bd18', "id", 'Sport & Exercise Psychology', 'Unknown', 5040, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/19/details/university-of-thessaly', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Thessaly' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceUrl", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('2f68232b-2d4f-4f53-b660-08b359a2da2c', 'University of Ioannina', 'Greece', 'Ioannina', 'https://uoi.gr', true, 'https://apply.studyingreece.edu.gr/en/universities/20/details', '2026-09-23'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://uoi.gr/wp-content/uploads/2023/09/logo2-en-300x99.png","indicativeAvgBachelorFeeEUR":null,"indicativeAvgMasterFeeEUR":1667,"englishTaughtLevels":"Master''s","acceptsInternationalStudents":true}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceUrl" = EXCLUDED."sourceUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'ae140f61-2f8f-46ff-baa6-08d6a643b51b', "id", 'Digital Health', 'Masters', 1667, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/20/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Ioannina' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '1729cadd-ffc4-4b31-833e-cb64da97b9e0', "id", 'Biological Inorganic Chemistry', 'Masters', 1667, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/20/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Ioannina' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'c3a67237-e87f-411f-a9cb-115a5e206fbf', "id", 'Molecular Cellular Biology & Biotechnology', 'Masters', 1667, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/20/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Ioannina' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceUrl", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('359b1fee-8fe9-4417-b5b0-9b47f957f324', 'University of Patras', 'Greece', 'Patras', 'https://upatras.gr', true, 'https://apply.studyingreece.edu.gr/en/universities/23/details/university-of-patras', '2026-09-23'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://www.upatras.gr/wp-content/uploads/up_2017_logo_en.png","indicativeAvgBachelorFeeEUR":12000,"indicativeAvgMasterFeeEUR":2000,"englishTaughtLevels":"Bachelor''s + Master''s","acceptsInternationalStudents":true}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceUrl" = EXCLUDED."sourceUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '241e039b-a7ba-43d9-ab02-168a46deacaa', "id", 'Medical Degree', 'Bachelors', 12000, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/23/details/university-of-patras', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Patras' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '3b4c9961-d476-4adf-ab89-77c1acfc89ce', "id", 'Personalized Medicine', 'Unknown', 2000, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/23/details/university-of-patras', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Patras' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceUrl", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('271057f3-9383-4d46-b4e8-1e9271b20011', 'University of the Peloponnese', 'Greece', 'Tripoli / Kalamata / Sparta / Nafplio', 'https://uop.gr', true, 'https://apply.studyingreece.edu.gr/en/universities/25/details/university-of-the-peloponnese', '2026-09-23'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://www.uop.gr/sites/default/files/images/2025-11/logo-blue-for-uop.gr-site-en.png","indicativeAvgBachelorFeeEUR":null,"indicativeAvgMasterFeeEUR":5000,"englishTaughtLevels":"Master''s","acceptsInternationalStudents":true}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceUrl" = EXCLUDED."sourceUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '98754571-b186-46a3-9d7a-071845675a75', "id", 'Olympic Studies, Olympic Education, Organization & Management of Olympic Events', 'Masters', 5000, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/25/details/university-of-the-peloponnese', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of the Peloponnese' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'd4f64173-0ba3-449a-be5c-65650db7f8c1', "id", 'international catalog also lists CultTech', 'Masters', 5000, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/25/details/university-of-the-peloponnese', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of the Peloponnese' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceUrl", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('4c3f01cf-b446-4e39-9f94-e5e80091f1a5', 'University of the Aegean', 'Greece', 'Rhodes / Mytilene / Aegean islands', 'https://aegean.gr', true, 'https://apply.studyingreece.edu.gr/en/universities/16/details/university-of-the-aegean', '2026-09-23'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://www.aegean.gr/sites/default/files/logo-aegean-gia-web-el_0_0.png","indicativeAvgBachelorFeeEUR":4500,"indicativeAvgMasterFeeEUR":7500,"englishTaughtLevels":"Bachelor''s + Master''s","acceptsInternationalStudents":true}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceUrl" = EXCLUDED."sourceUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '3c1908f6-5ff4-4269-aa27-f78c220d1e51', "id", 'Eastern Mediterranean Studies', 'Unknown', 7500, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/16/details/university-of-the-aegean', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of the Aegean' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '18022abe-7f45-48c7-a6c0-c0eeeb1c539e', "id", 'Digital Deep-Tech Circular Economy', 'Unknown', 7500, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/16/details/university-of-the-aegean', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of the Aegean' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'cc901f60-cd1c-43f2-82be-a99304a3a7d5', "id", 'MBA Shipping', 'Masters', 7500, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/16/details/university-of-the-aegean', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of the Aegean' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '9f9e28b6-c758-45d4-aba7-bd9b8698e998', "id", 'Air Transport Management', 'Unknown', 7500, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/16/details/university-of-the-aegean', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of the Aegean' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '95fe29af-3f5b-4829-85ff-4619d09e674a', "id", 'Migration & Refugee Flows', 'Unknown', 7500, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/16/details/university-of-the-aegean', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of the Aegean' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'fa9f570f-b425-450e-a767-eb72204d18fa', "id", 'Islands & Sustainability', 'Unknown', 7500, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/16/details/university-of-the-aegean', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of the Aegean' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceUrl", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('656a4e94-0aa6-4fc2-ba90-bac1f5ec0690', 'Ionian University', 'Greece', 'Corfu / Ionian Islands', 'https://ionio.gr', true, 'https://apply.studyingreece.edu.gr/en/universities/14/details/ionio-panepistimio', '2026-09-23'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://ionio.gr/images/layout/ionio_logo_hor_en.svg","indicativeAvgBachelorFeeEUR":null,"indicativeAvgMasterFeeEUR":3600,"englishTaughtLevels":"Master''s","acceptsInternationalStudents":true}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceUrl" = EXCLUDED."sourceUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'cdb7ad05-7c9d-41fd-92f3-237a30c35a7b', "id", 'MA Adriatic Studies', 'Masters', 3600, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/14/details/ionio-panepistimio', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Ionian University' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceUrl", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('aa301206-2b30-4113-8610-91d88ebb28c0', 'University of Crete', 'Greece', 'Heraklion / Rethymno', 'https://uoc.gr', true, 'https://apply.studyingreece.edu.gr/en/universities/21/details', '2026-09-23'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://thumb.wikimedia.org/wikipedia/en/thumb/c/ca/University_of_Crete_Emblem.png/250px-University_of_Crete_Emblem.png","indicativeAvgBachelorFeeEUR":15000,"indicativeAvgMasterFeeEUR":4000,"englishTaughtLevels":"Bachelor''s + Master''s","acceptsInternationalStudents":true}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceUrl" = EXCLUDED."sourceUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '77737b68-554c-40b9-8576-a6df84ac873d', "id", 'International Program in Medicine', 'Unknown', 4000, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/21/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Crete' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'cff61fdf-7df1-43d1-b207-6140288c529e', "id", 'Immunobiology', 'Unknown', 4000, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/21/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Crete' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '64fb6988-cac7-4015-a751-0933074f1538', "id", 'Biomedical Engineering', 'Unknown', 4000, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/21/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Crete' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '5d76ee68-5e35-410d-b38d-92aecc939d3e', "id", 'Brain & Mind', 'Unknown', 4000, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/21/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Crete' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'accf3a84-ef00-4e39-8eb9-e5334bf968d7', "id", 'Soft Matter', 'Unknown', 4000, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/21/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Crete' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '3dbff378-ed9a-481b-8ab2-bc78074d82c8', "id", 'Vision Sciences', 'Unknown', 4000, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/21/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Crete' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '30898b31-4a02-4b9c-9ff0-929dedccc478', "id", 'Forensic Medicine', 'Unknown', 4000, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/21/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Crete' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceUrl", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('75371b92-21d8-427a-a7f9-8c3066ab3875', 'Technical University of Crete', 'Greece', 'Chania', 'https://tuc.gr', true, 'https://apply.studyingreece.edu.gr/en/universities/28/details/technical-university-of-crete', '2026-09-23'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://www.tuc.gr/typo3conf/ext/tucmmforumhook/Resources/Public/Initialtemplates/templates/bootstrap/imgs/logo-en-r.png","indicativeAvgBachelorFeeEUR":null,"indicativeAvgMasterFeeEUR":2167,"englishTaughtLevels":"Master''s","acceptsInternationalStudents":true}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceUrl" = EXCLUDED."sourceUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '63554de0-7a52-405c-848e-cb82b6ab251f', "id", 'Machine Learning & Data Science', 'Masters', 2167, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/28/details/technical-university-of-crete', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Technical University of Crete' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'bd212c39-ea4a-4a6e-9138-fde3e1fd3bfb', "id", 'Responsible Consumption & Production under Sustainable Mining', 'Masters', 2167, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/28/details/technical-university-of-crete', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Technical University of Crete' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '5f9fd7b4-8e8a-4925-8f9a-f9efdbe11e30', "id", 'Sustainable Energy/Raw Materials', 'Masters', 2167, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/28/details/technical-university-of-crete', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Technical University of Crete' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '5dddc2d6-97fb-4632-b005-f087ab89a5c0', "id", 'Sustainable Engineering & Climate Change', 'Masters', 2167, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/28/details/technical-university-of-crete', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Technical University of Crete' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceUrl", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('e5da5e63-ea50-41da-9c09-b35a26c35da7', 'Hellenic Mediterranean University', 'Greece', 'Heraklion / Crete', 'https://hmu.gr', true, 'https://apply.studyingreece.edu.gr/en/universities/13/details', '2026-09-23'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://thumb.wikimedia.org/wikipedia/en/thumb/f/fd/Hellenic_Mediterranean_University_Logo.png/250px-Hellenic_Mediterranean_University_Logo.png","indicativeAvgBachelorFeeEUR":null,"indicativeAvgMasterFeeEUR":null,"englishTaughtLevels":"Master''s","acceptsInternationalStudents":true}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceUrl" = EXCLUDED."sourceUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'b0edeb41-d116-4659-bbfa-09efe64889ce', "id", 'EMINENT', 'Masters', 0, NULL, 'https://apply.studyingreece.edu.gr/en/universities/13/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Hellenic Mediterranean University' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'be7afcbc-ed8f-424a-86fb-21c41ca36d88', "id", 'Lasers, Plasma & Applications (listed as free)', 'Masters', 0, NULL, 'https://apply.studyingreece.edu.gr/en/universities/13/details', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Hellenic Mediterranean University' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceUrl", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('29959fcf-35fd-4c01-b188-89d0a2637f91', 'University of Western Macedonia', 'Greece', 'Kozani / Florina / Western Macedonia', 'https://uowm.gr', true, 'https://apply.studyingreece.edu.gr/en/universities/18/details/university-of-western-macedonia', '2026-09-23'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://www.uowm.gr/wp-content/uploads/2023/05/UOWM_Logo_Eng.png","indicativeAvgBachelorFeeEUR":5500,"indicativeAvgMasterFeeEUR":3047,"englishTaughtLevels":"Bachelor''s + Master''s","acceptsInternationalStudents":true}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceUrl" = EXCLUDED."sourceUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'c99d97ba-37a5-4b64-a1c4-d27bf155dced', "id", 'BSc Economics & Sustainable Development', 'Bachelors', 5500, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/18/details/university-of-western-macedonia', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Western Macedonia' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'b4268e41-ae85-4044-9c8c-be88b589e8e3', "id", 'BA Creative Writing, Arts & Humanities', 'Bachelors', 5500, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/18/details/university-of-western-macedonia', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Western Macedonia' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'a37e6b81-ddbf-46be-8654-e8f5fd86cf6e', "id", 'MBA Business Economics & AI', 'Masters', 3047, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/18/details/university-of-western-macedonia', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Western Macedonia' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '8cf22e50-e436-4760-b898-5c56a2388380', "id", 'Digital Marketing', 'Unknown', 3047, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/18/details/university-of-western-macedonia', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Western Macedonia' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '421eea18-5b9d-443c-851d-6833a44acf92', "id", 'Food Quality', 'Unknown', 3047, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/18/details/university-of-western-macedonia', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Western Macedonia' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '99b84601-5b3b-4a69-9634-e750a9c993b5', "id", 'Advanced IT', 'Unknown', 3047, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/18/details/university-of-western-macedonia', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'University of Western Macedonia' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;

INSERT INTO "universities" ("id", "name", "country", "city", "websiteUrl", "isPublic", "sourceUrl", "sourceCheckedAt", "publicMetadata", "createdAt", "updatedAt")
VALUES ('df2aa69e-f783-440f-a02b-d30115558d24', 'Hellenic Open University', 'Greece', 'Patras (distance learning)', 'https://eap.gr', true, 'https://apply.studyingreece.edu.gr/en/universities/12/details/hellenic-open-university', '2026-09-23'::timestamp, '{"networks":["GOVERNMENT"],"logoUrl":"https://upload.wikimedia.org/wikipedia/en/3/3b/EAP_Official_Logo.png","indicativeAvgBachelorFeeEUR":null,"indicativeAvgMasterFeeEUR":3719,"englishTaughtLevels":"Master''s","acceptsInternationalStudents":true}'::jsonb, now(), now())
ON CONFLICT ("name", "country") DO UPDATE SET "city" = EXCLUDED."city", "websiteUrl" = EXCLUDED."websiteUrl", "sourceUrl" = EXCLUDED."sourceUrl", "sourceCheckedAt" = EXCLUDED."sourceCheckedAt", "publicMetadata" = EXCLUDED."publicMetadata", "updatedAt" = now();
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT '2fce8852-5173-491f-8e6b-8db1536624df', "id", 'MEd Teaching English as a Foreign/International Language', 'Masters', 3719, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/12/details/hellenic-open-university', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Hellenic Open University' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'a25458c7-c9fc-488d-8b02-eeca82845140', "id", 'Language Education for Refugees & Migrants', 'Masters', 3719, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/12/details/hellenic-open-university', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Hellenic Open University' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'da6db212-18fe-44ce-8a39-164ad54e0f7c', "id", 'MBA', 'Masters', 3719, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/12/details/hellenic-open-university', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Hellenic Open University' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;
INSERT INTO "university_programs" ("id", "universityId", "title", "level", "tuitionAmount", "tuitionCurrency", "sourceUrl", "sourceCheckedAt", "active", "createdAt", "updatedAt")
SELECT 'b78cd60b-f4e4-4674-b5a6-077365c523ae', "id", 'Data Science & Machine Learning', 'Masters', 3719, 'EUR', 'https://apply.studyingreece.edu.gr/en/universities/12/details/hellenic-open-university', '2026-09-23'::timestamp, true, now(), now()
FROM "universities" WHERE "name" = 'Hellenic Open University' AND "country" = 'Greece'
ON CONFLICT DO NOTHING;

