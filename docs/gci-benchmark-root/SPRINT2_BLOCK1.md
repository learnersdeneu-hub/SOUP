# Sprint 2 — Block 1 checkpoint: Gemini pilot intelligence

## Scope completed
- Gemini is the active pilot AI runtime behind GCI's existing provider-neutral `AIProvider` interface.
- Default pilot model is `gemini-3.6-flash`, configurable via `AI_MODEL`.
- Native Gemini REST/SSE streaming is used, so the legacy `@google/generative-ai` SDK is not required.
- `GEMINI_API_KEY` stays server-only.
- OpenAI provider code remains parked for a later production/provider switch but is not required for the pilot.
- Anthropic runtime/dependency is removed from the canonical pilot repository to eliminate stale provider/build drift.
- Existing customer-facing routes remain provider-neutral.
- Token usage continues through the existing `trackTokenUsage` hook.

## Verification gates
1. `npm install` on the Dell and commit/retain the generated lockfile for reproducibility.
2. `npm run check:repo`.
3. `npm run check:deep`.
4. `npm run check:ai` with `.env.local` configured.
5. `npm run prisma:validate:local` and review migration status.
6. `npm run typecheck`.
7. `npm run build`.
8. Live Gemini round-trip in the Resume conversation before further Sprint 2 feature work.

## Required local environment
`AI_PROVIDER=gemini`
`AI_MODEL=gemini-3.6-flash`
`GEMINI_API_KEY=<server-side key>`

OpenAI is intentionally parked for later and does not need credits for the pilot.
