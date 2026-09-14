# SOUP v2.10 engineering hardening

This patch continues from v2.9 without redesigning product behavior.

## Validation

- Central Zod coverage now includes JSON payloads, query strings, form-data metadata, upload metadata, checkout input, export input, and the signed Stripe webhook envelope.
- `scripts/validation-coverage-audit.mjs` classifies every API route and fails when a route reads structured request input without importing the centralized validation schemas.
- Current static result: 38/38 routes classified; 27 schema-validated request-input routes, 1 signed raw webhook route, 10 routes with no structured request input.
- Bodyless/disabled endpoints are intentionally not given fake schemas just to inflate a metric.

## Type safety

- The explicit TypeScript `any` budget is now zero.
- The budget script ignores normal English uses of the word "any" in prompts, comments and UI copy and checks explicit TypeScript `any` constructs instead.

## RLS

- Static coverage remains 28/28 direct `profileId`/`userId` tables with RLS enabled.
- The live verification script now creates temporary Student A/B auth identities and profiles itself, requires fixture coverage to exactly match every remaining direct student-scoped table, verifies cross-user SELECT and DELETE isolation, and includes an own-profile positive control.
- The live test still requires a real isolated Supabase project and is therefore not claimed as passed in the build environment when those credentials/fixtures are unavailable.
