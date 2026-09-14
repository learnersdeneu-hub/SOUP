# GCI Sprint 1 — local QA gate

Sprint 2 must not start until this gate passes on a normal development machine with access to the public npm registry and the intended Supabase project.

## 1. Extract to a new folder

Do not overwrite an older working copy. Copy the real `.env.local` into the new project folder after extraction.

## 2. Confirm npm registry

```powershell
npm config get registry
```

Expected on a normal machine:

```text
https://registry.npmjs.org/
```

## 3. Install dependencies

```powershell
npm.cmd install
```

## 4. Prisma schema/client checks

```powershell
npx.cmd prisma generate
npx.cmd prisma validate
```

## 5. Migration baseline decision — do this before deploy

Read `MIGRATION_BASELINE.md`.

### Fresh empty database

```powershell
npx.cmd prisma migrate deploy
npm.cmd run seed
```

### Existing GCI Supabase database that already contains Core tables

Do **not** execute the Core baseline CREATE statements over existing Core tables. If the baseline is not already recorded in `_prisma_migrations`, mark it applied first:

```powershell
npx.cmd prisma migrate resolve --applied 20260801000000_core_baseline
npx.cmd prisma migrate deploy
npm.cmd run seed
```

If later Sprint 1 tables/columns already exist but their migration records do not, stop and compare the live schema rather than guessing which migrations to mark applied.

## 6. Repository consistency + TypeScript + production build

```powershell
npm.cmd run check:repo
npm.cmd run typecheck
npm.cmd run build
```

All three must pass before Sprint 2.

## 7. Start locally

```powershell
npm.cmd run dev
```

Open the exact `Local:` address printed by Next.js.

## 8. Manual acceptance test

### Visitor / Resume Passport
- Landing page loads.
- Public Resume Builder opens without an unnecessary sign-in wall.
- Student, Graduate, Professional, International Student and Job Seeker paths can be selected.
- Questionnaire validates required fields.
- Resume generation produces structured content when the configured AI provider is available.
- Cover letter is generated and remains within the intended concise format.
- PDF/DOCX/image resume import accepts only the supported file types and size limit.
- Import rate limiting returns HTTP 429 after excessive repeated requests.
- Guest work survives the sign-up/sign-in transition and can be saved.

### Authentication
- New sign-up works.
- Email-confirmation flow is understandable when enabled in Supabase.
- Sign-in works.
- Refresh preserves the session.
- Password reset works.
- Sign-out works.
- A corresponding Prisma User + Profile exists exactly once.

### Customer account
- `/dashboard` loads only the signed-in customer's data.
- Resume can be edited and saved.
- Saving creates immutable resume versions.
- A prior version can be restored without deleting history.
- Resume Intelligence uses saved resume content and does not fabricate hiring outcomes.
- Career goal can be saved.
- Opportunity Hub shows honest empty state when no provider is configured.
- Career Coach does not claim live opportunities without provider data.

### Documents / notifications / support
- Customer can upload a document.
- Customer can only obtain signed URLs for their own documents.
- Review status is visible.
- Customer cannot see internal support notes.
- Notifications can be marked read / all read.
- Support ticket can be created and replied to.

### ADMIN
- Admin routes reject CUSTOMER users.
- Admin can see document review queue.
- Admin can approve/reject/request more information.
- Verification resolution remains ADMIN-only in Sprint 1.
- Audit view displays review events.

### SUPPORT
- Support cannot approve documents or resolve verification.
- Support can access only customers/tickets assigned to that support user where assignment scoping applies.
- `/admin/audit` shows only review events for profiles in that support user's assigned queue.
- Internal notes never appear in the customer support UI.

## 9. AI provider smoke test

Configure only one provider first. Confirm:
- API key exists only server-side.
- Chat streams.
- User and assistant messages persist once each.
- Refresh restores the conversation.
- Resume generation/import handles provider errors without losing user input.

## 10. Record results

For each failure capture:
- exact command or page
- complete terminal error
- browser error text
- steps that reproduced it

Do not start Sprint 2 until `npm install`, Prisma validation, typecheck and production build have all passed on the Dell.
