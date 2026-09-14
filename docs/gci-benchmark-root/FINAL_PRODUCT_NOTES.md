# GCI final-product continuation build

This build deliberately starts from `GCI_Sprint3_Consolidated_Debugged(1).zip` to preserve the known-good UX and architecture.

## Added in this continuation
- Scanned/image-only PDF fallback: normal `pdf-parse` first, then multimodal document reading when text is insufficient.
- Existing JPG/PNG OCR retained; weak OCR now falls back to multimodal reading.
- Extraction method (`TEXT`, `OCR`, `VISION`) is passed into evidence analysis and returned by the evidence API.
- Property evidence continues to distinguish document-stated values from current market valuation.
- Resume-generation server diagnostic logging retained.
- Deep invariant check extended to guard scanned-PDF fallback.
- Evidence route duration raised to allow scan transcription followed by structured evidence analysis.

## Preserved
- Existing Supabase/Prisma architecture and schema.
- Existing Gemini/OpenAI provider abstraction, retries/rate-limit/usage infrastructure.
- Resume + cover-letter PDF/DOCX exports.
- Conversation history/new-chat behavior.
- Full GCI and Financial PDF exports.
- Admin/support access boundaries.
- Existing auth gates and customer-facing provider-neutral errors.

## Environment
`DOCUMENT_AI_MODEL` is optional. If empty, scanned-document reading uses `AI_MODEL`. `GEMINI_API_KEY` must be configured for the scanned-PDF multimodal fallback in this build.

## Verification performed here
- `node scripts/repo-check.mjs`: PASS (123 source files, 28 routes, 10 migrations).
- `node scripts/deep-check.mjs`: PASS (29/29 invariants).
- Full dependency install/build could not be completed in this restricted execution environment because npm installation exceeded the tool timeout. Do not represent that as a build failure; run the normal Dell gate below.

## Dell release gate
From the project directory with the working `.env.local`:
1. `npm.cmd install`
2. `npm.cmd run check:repo`
3. `npm.cmd run check:deep`
4. `npm.cmd run prisma:validate:local`
5. `npm.cmd run prisma:status:local`
6. `npm.cmd run typecheck`
7. `npm.cmd run build`
8. `npm.cmd run dev`
9. Live-test Resume, scanned property PDF, Full GCI, Financial, history/new-chat, admin/support.

## Production gates intentionally not forced into the known-good Sprint 3 baseline
- Controlled Next.js supported-LTS migration must be tested separately before production; a blind major upgrade risks breaking the currently working app.
- Payments/subscriptions require a selected payment processor, commercial plan/price IDs, webhook secret and billing policy. They should be added as an isolated monetization module rather than guessed into the core build.

## Property evidence normalization correction (2026-08-29)

Live testing with scanned property certificates exposed two production issues after the scanned-PDF vision fallback was added:

1. Gemini could return nearly-valid JSON with a minor syntax error. `parseJSONObject` now preserves strict `JSON.parse` first and uses `jsonrepair` only as a fallback when strict parsing fails.
2. Multi-property certificates could be read successfully but their owner/location/declared-value facts were not normalized into the `PropertyEvidence` fields used by Financial readiness. The evidence schema/prompt now returns `propertyDetails`, supports multiple property rows, maps normalized owner/location/document-stated values, and broadens property-document classification without treating every generic asset document as real property.

Financial readiness now aggregates core property support across processed property evidence instead of inspecting only one row. It still requires a second independent property evidence source for a final property-focused report, because a single certificate should not be treated as independent corroboration or as a current market valuation.

Local static verification in the build workspace after this correction:
- Repository consistency: PASS (123 source files, 28 routes, 10 migrations)
- Deep invariants: PASS (32/32)
- Changed TypeScript files: syntax/transpile PASS
- Full dependency install/build must still be re-run on the Dell against the real `.env.local` before this package replaces the live-test baseline.
