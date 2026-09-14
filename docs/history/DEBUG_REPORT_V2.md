# GCI Sprint 1 — gap-fill and detailed static QA report

## Fixed after independent QA

1. Added a Core baseline migration (`20260801000000_core_baseline`) that creates every table and enum in the pre-Passport Core + chat Prisma schema.
2. Added an idempotent Prisma seed for the lookup codes the current application actually depends on: credential types, score categories/rule v1, organization types and case types.
3. Added safe instructions for baselining an existing Supabase database without executing CREATE TABLE statements over tables that already exist.
4. Scoped `/admin/audit` for SUPPORT users to profiles with tickets assigned to that support user. ADMIN remains global.
5. Added per-IP in-process rate limiting to the public resume-import/OCR route (5 imports/minute/process).
6. Corrected the misleading Prisma DATABASE_URL/DIRECT_URL comment.
7. Sanitized `.env.example` so it no longer embeds the live Supabase project reference/region.
8. Added a dependency-free repository consistency checker (`npm run check:repo`).

## Tests actually executed in this environment

### PASS — Node syntax
`node --check prisma/seed.js`

### PASS — repository consistency
`node scripts/repo-check.mjs`
- 96 source files inspected
- 27 page routes discovered
- 5 SQL migrations discovered
- all internal `@/` imports resolved
- all `process.env.*` application keys represented in `.env.example`
- every current Prisma `@@map` table name occurs in migration SQL

### PASS — baseline coverage
Static comparison against the original pre-Passport Prisma schema:
- 46 Core/chat models expected; 46 baseline `CREATE TABLE` statements present
- 21 Core/chat enums expected; 21 baseline `CREATE TYPE ... AS ENUM` statements present
- scalar field/column comparison: no missing or extra baseline columns
- 68 schema relations expected; 68 baseline foreign keys present
- no duplicate generated constraint/index identifiers

### BLOCKED — dependency install
`npm install --ignore-scripts` could not complete because this environment routes npm through an internal package mirror and returned 404 for `@anthropic-ai/sdk`. This is the same environment limitation independently observed during the external QA review and is not evidence that the package/version is invalid.

### NOT A VALID FULL TYPECHECK HERE
A global TypeScript compiler can parse the source, but because `node_modules` cannot be installed here it reports missing Next/React/Prisma/Supabase/provider type declarations and cascaded JSX/implicit-any errors. Those results cannot substitute for `npm run typecheck` after a real install.

## Remaining mandatory QA
Run the exact gate in `SPRINT1_QA.md` on a normal machine. Sprint 1 is not declared production-build-passed until npm install, Prisma generate/validate, typecheck and Next production build pass there.

## Known non-blocking technical debt
- AI/chat rate limiting remains in-memory/per-process and should become distributed before multi-instance production scale.
- Resume-import rate limiting is now present but is likewise per-process.
- Attestation-standard values, consent-policy text and ScoreBand boundaries are intentionally not invented by the seed; they require approved business/compliance definitions.
- Native partitioning for AccessAuditLog remains a future database-operations migration, as already documented by the Core schema comment.
