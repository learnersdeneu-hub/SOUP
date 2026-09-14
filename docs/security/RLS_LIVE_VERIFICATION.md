# SOUP RLS live verification

This is a **non-production** verification procedure for the defense-in-depth PostgreSQL RLS policies. Prisma remains SOUP's trusted server data layer; these checks prove that a normal authenticated Supabase client cannot cross the Student A / Student B boundary if a direct data-API call is attempted.

## Static coverage

Run:

```bash
npm run check:rls
```

The audit derives every Prisma model with a direct `profileId` or `userId` field and verifies that its mapped PostgreSQL table has `ENABLE ROW LEVEL SECURITY` in migrations. At the current schema revision this is **28/28 direct user-scoped tables**. Five dependent tables are also RLS-protected through their parent ownership relationship: `chat_messages`, `support_ticket_messages`, `resume_versions`, `student_application_documents`, and `journey_checklist_items`.

The first RLS migration grants explicit own-row policies only to tables that may plausibly be reached through a direct authenticated Supabase data client. The follow-up migration enables RLS with **no authenticated policy** on the remaining server-only/sensitive tables. No policy means direct browser access is denied by default; Prisma server authorization remains the application path.

## Live two-student verification

A live run requires a disposable Supabase test project. Do not run the destructive test against production.

1. Apply every migration to the test project.
2. Create Student A and Student B through SOUP's normal signup/provisioning flow so their Supabase Auth UUIDs match `users.id` and `profiles.userId`.
3. As a trusted test administrator, create at least one Student B fixture row in **every RLS-enabled table**. For dependent tables, create the required parent row first. Record each B-row `id` in a JSON object keyed by PostgreSQL table name.
4. Configure the following environment variables locally (never commit them):

```env
RLS_TEST_SUPABASE_URL="https://...supabase.co"
RLS_TEST_ANON_KEY="..."
RLS_TEST_STUDENT_A_EMAIL="student-a-test@example.invalid"
RLS_TEST_STUDENT_A_PASSWORD="..."
RLS_TEST_STUDENT_B_FIXTURES_JSON='{"profiles":"...","documents":"..."}'
RLS_TEST_ACK_DESTRUCTIVE="YES_NON_PRODUCTION"
```

5. Run:

```bash
node scripts/rls-live-verification.mjs
```

The script signs in as **Student A with the normal anon/authenticated Supabase client — never Prisma and never the service-role key**. For every supplied Student B fixture it asserts:

- SELECT returns no B row.
- DELETE cannot return/delete the B row.

The delete probe is intentionally destructive if a policy is broken, which is why the script refuses to run without the explicit non-production acknowledgement.

6. Repeat with A/B swapped for symmetry.
7. Destroy the test users/fixtures after verification.

## Why this is not in `verify:deploy`

`verify:deploy` must be deterministic and runnable without production/test credentials. The live RLS test needs a real Supabase Auth session and seeded database, so CI should run it only in a dedicated integration environment. A static RLS coverage audit **is** part of `verify:deploy` and prevents future direct `profileId`/`userId` models from being added without RLS coverage.
