# SOUP Build Status

## Current baseline

SOUP v2.8 Engineering Hardening Candidate.

This is the frozen v2.7 deployment candidate plus a targeted engineering-hardening patch. Future changes should be small debug/QA patches against this baseline rather than whole-app rebuilds.

## Added in v2.8

- Zod added as the canonical request-validation library.
- Shared API user/profile guards added.
- High-risk application, journey, conversation and payment flows migrated to typed validation/ownership guards.
- Vitest automated test harness added.
- Security tests added for protected API route structure and client secret boundaries.
- A protected-route audit is part of the deployment gate.
- Type-safety regression budget added so `any` usage cannot silently grow; remaining legacy `any` sites are tracked debt and should be reduced incrementally after typecheck rather than mass-replaced unsafely.
- Defense-in-depth Postgres RLS policies added for direct Supabase access to core user-owned tables. Prisma remains the trusted server data layer and still requires server authorization.
- Historical build reports moved out of the repository root into `docs/history/`.
- Active architecture/security/testing/deployment docs added.
- Payment confirmation now requires the signed-in profile to own the payment being activated.

## Important status

The source-level SOUP invariant suite and migration checks pass in the artifact environment. Dependency-backed `npm test`, `npm run typecheck`, `npm run build`, Supabase migration execution, browser QA, email delivery, OAuth and payment tests must be run on the configured local/production environment before deployment.


## v2.10 validation / RLS hardening

- API validation coverage: 38/38 routes classified; all 28 routes that read structured/raw request input are centrally schema-validated or use the signed Stripe webhook validation path. Ten routes have no structured request input and are intentionally not given fake schemas.
- Explicit TypeScript `any`: 0; budget locked at 0.
- Static RLS coverage: 28/28 direct `profileId`/`userId` tables.
- Live RLS isolation: test harness is complete but must be executed against an isolated real Supabase project; no pass is claimed without that infrastructure.
- Full dependency-backed Vitest/typecheck/Next build must still be run locally because package installation timed out in the build environment.
