# CI pipeline

`.github/workflows/ci.yml` runs on every push to `main` and every pull
request targeting `main`. It has two independent jobs.

## `verify` job

Runs the exact same gate as the local `npm run verify:deploy` script, in
order, failing fast on the first broken step:

1. `npm run test` — Vitest: unit tests (state machine, Gemini retry/backoff,
   attachment matching, validation schemas) + security tests (secret
   boundaries, auth-guard structure, Sentry config boundaries).
2. `npm run check:auth` — every non-public API route has a recognized auth
   guard.
3. `npm run check:validation` — every API route's input surface (JSON body,
   query params, form data, or signed webhook) goes through a central zod
   schema.
4. `npm run check:rls` — every Prisma model with `profileId`/`userId` maps to
   a table with Postgres RLS enabled.
5. `npm run check:any` — zero explicit TypeScript `any` constructs.
6. `npm run prisma:validate:local` — schema syntax/consistency.
7. `npm run typecheck` — `tsc --noEmit`.
8. `npm run build` — production Next.js build.

Build-time env vars are supplied from repository secrets when set, and fall
back to inert placeholders otherwise (see the `env:` block in the workflow)
so the workflow runs immediately on a fork without requiring secrets to be
configured first — a real deploy still needs the real secrets set in Vercel
(or wherever it's hosted), this only needs enough to get through `next
build`.

## `dependency-audit` job

Runs `npm audit --audit-level=high` and fails the check if any dependency
has a known high/critical vulnerability. This runs independently of the
`verify` job so a new CVE in an existing dependency (not just a newly added
one) is caught on every PR, not only when `package.json` changes.

Dependabot (`.github/dependabot.yml`) complements this by opening weekly PRs
to bump dependencies before they go stale, batching routine patch/minor
updates into one PR and leaving majors to their own PR for review.

## What this does not cover

- The e2e authenticated-flow tests (`tests/e2e/student-application-flow.spec.ts`)
  need a real staging deployment and a seeded test account — see
  `tests/e2e/README.md`. They are intentionally not part of this workflow;
  wire them into a separate scheduled/staging job once a staging environment
  exists.
- The live two-student RLS verification (`scripts/rls-live-verification.mjs`)
  needs a disposable Supabase test project for the same reason — see
  `docs/security/RLS_LIVE_VERIFICATION.md`.
