# GCI Pilot Main — Consolidation Review

## Why this checkpoint exists
The project had begun to accumulate a full Sprint 1.5 repository plus Node-24 fixes plus an OpenAI Sprint 2 overlay plus a Gemini overlay. The underlying architecture remained coherent, but version/process drift was becoming a real risk. This checkpoint consolidates the current intended pilot architecture into one full repository.

## Consolidation changes
- Base: latest full Sprint 1.5 Node-24-fixed repository.
- Gemini native REST/SSE provider merged into the full application.
- Pilot default: `gemini-3.6-flash` via `GEMINI_API_KEY`.
- OpenAI provider kept parked for later; not required to run the pilot.
- Anthropic provider/dependency removed.
- Legacy `@google/generative-ai` dependency removed; Gemini uses native `fetch`.
- Stale OpenAI-default deep test replaced with Gemini-pilot invariants.
- AI errors streamed to customers are provider-neutral; raw Gemini/provider errors are not sent to the browser.
- Historical Sprint/audit notes moved under `docs/history/` to reduce root clutter.
- Active root documentation now points to this single canonical repository.

## Executed checks in this environment
- `node scripts/repo-check.mjs`: PASS — 118 source files, 28 page routes, 10 migrations.
- `node scripts/deep-check.mjs`: PASS — 20/20 current invariants.
- TypeScript parser pass: PASS — 118 `.ts/.tsx` files, 0 syntax diagnostics.
- Node syntax check for local helper scripts: PASS.
- Full dependency install/build: NOT completed here; `npm install` did not finish within the sandbox execution window. Dell remains the authoritative dependency/type/build runtime gate.

## Important known next feature
The modern Resume conversation and the existing Resume upload/import are still separate entry paths. For the real pilot behavior (student uploads an old Resume, talks briefly, requests changes, downloads Resume + Cover Letter), the next focused feature should integrate existing-resume upload directly into the modern Resume conversation and reuse the existing extraction pipeline.

## Document exports currently coded
- Resume: PDF
- Cover Letter: PDF
- Full GCI snapshot: 3-page PDF
- Financial: 2-page standalone or 5-page integrated PDF

DOCX export is **not currently implemented** and should not be represented as complete.

## Production blockers not part of this consolidation
- Upgrade Next.js from 14.2.35 to a supported security line before public production.
- Replace in-memory rate limiting with distributed/shared limiting before multi-instance scale.
- Move expensive document processing to queued/background workers before institutional volume.
- Complete security/compliance/load gates before university/visa-adjacent institutional use.

## Source-of-truth rule
Do not overlay older Sprint ZIPs onto this repository. Future work should branch/checkpoint from `gci-pilot-main` only.
