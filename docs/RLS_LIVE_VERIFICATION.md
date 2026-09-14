# Live RLS verification

`npm run check:rls` is the static coverage gate. It confirms every Prisma model with a direct `profileId` or `userId` field has PostgreSQL RLS enabled.

`npm run check:rls-live` is the real cross-user isolation test. It must be run only against an isolated Supabase test project. It creates two temporary auth users plus matching public user/profile rows, signs in as Student A through the anon client, and verifies Student A cannot read or delete Student B rows across every direct profile/user-scoped table.

Because several protected tables depend on seeded reference/catalog records, Student B child-row fixture IDs must be supplied in `RLS_TEST_STUDENT_B_FIXTURES_JSON`. The script derives the expected protected table list from `prisma/schema.prisma` and fails before testing if the fixture map is incomplete or contains unexpected tables. The `profiles` fixture is created automatically.

Required environment variables:

- `RLS_TEST_SUPABASE_URL`
- `RLS_TEST_ANON_KEY`
- `RLS_TEST_SERVICE_ROLE_KEY`
- `RLS_TEST_STUDENT_B_FIXTURES_JSON`
- `RLS_TEST_ACK_DESTRUCTIVE=YES_NON_PRODUCTION`

Never point this test at production.
