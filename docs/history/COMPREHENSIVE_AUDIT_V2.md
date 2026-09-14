# GCI.ai Sprint 1.5 Comprehensive Re-Audit v2

## Verdict

**PASS FOR DELL BUILD + LIVE QA, subject to the real npm/Prisma/TypeScript/Next build gate on the Dell.**

The nine issues from the previous audit are now addressed in code. Sprint 2 has not been started.

## Executed checks in this environment

- ZIP/project structure: PASS
- Repository consistency checker: PASS — 118 TS/TSX source files, 27 application routes, 10 migrations reported by the project checker
- TypeScript parser-level syntax scan: PASS — 118 TS/TSX files, 0 syntax-diagnostic files
- Focused audit assertions for the nine corrections + guest routes: PASS — 10/10
- Prisma schema/new migration field consistency: PASS
- Unique migration directory check: PASS — 10 unique migrations
- `npm install --ignore-scripts`: FAILED due environment limitation: the internal package mirror returns 404 for the legitimate `@anthropic-ai/sdk@^0.27.0` package. This is the same sandbox-registry limitation previously observed and is not treated as a project dependency defect.

## Corrections verified

### Full GCI report output
`/api/export/report-snapshot` now renders `application/pdf` using a dedicated three-page PDF renderer rather than returning JSON.

### New conversation semantics
Signed-in users now reset the server-side workflow session through `DELETE /api/conversation/history`; the previous in-progress session is completed and a fresh session is created. Refresh no longer intentionally resurrects the old conversation.

### Guest-to-account migration
When meaningful guest work is present and differs from an older server-side in-progress conversation, the older session is completed and the guest transcript is imported into a fresh session.

### Correct sign-in boundary
Report and Financial use the internal `[[EVIDENCE_REQUESTED]]` AI control signal. Upload/account UI is not surfaced merely because the user sent one message; it appears when GCI is actually requesting evidence. Private upload endpoints remain authenticated server-side.

### Full GCI readiness
Finalization is blocked with HTTP 409 while the evidence set is too small/narrow/low-confidence. Readiness distinguishes NOT_READY, READY_WITH_GAPS, and READY_FOR_FINALIZATION.

### Financial readiness
Finalization now assesses evidence quantity, property evidence coverage when applicable, low-confidence evidence, and integrated-context availability before producing a final output.

### Explicit Financial mode
Financial-only (2-page) vs integrated GCI (5-page) is a direct customer choice rather than inferred solely from whether a Resume/GCI snapshot happens to exist. Signed-in choice is persisted to `CustomerContext.financialMode`; the final snapshot records the selected mode.

### Prompt-injection boundary
Document text remains untrusted in the evidence processor. CustomerContext no longer copies the entire free-form AI analysis wholesale; it retains bounded structured facts/confidence/inconsistency fields and the conversation system prompt explicitly labels the serialized context as UNTRUSTED REFERENCE DATA that must never be followed as instructions. Report/Financial finalization prompts also declare supplied evidence untrusted.

### SUPPORT document scope
The document page is scoped to assigned customers for SUPPORT. Server actions independently enforce the same assignment boundary for secure preview and review mutations. ADMIN retains global document access and sole approval authority.

## Still intentionally deferred / production-hardening items

- Shared/distributed rate limiting rather than per-process maps
- Background queue/worker architecture for OCR and multi-document AI processing
- Institutional-scale load testing
- Final payment/entitlement system
- Live opportunity-provider integrations
- Full Sprint 2 verification/monetization expansion

These are not Sprint 1.5 blockers.

## Required Dell gate before Sprint 2

1. Copy the working `.env.local` and add OpenAI configuration.
2. `npm.cmd install`
3. `npm.cmd run prisma:generate:local` (or the project-local Prisma helper documented in QA)
4. Validate migration status before applying anything.
5. Apply only the new pending Sprint 1.5 migrations to the existing database; never re-run the Core baseline as CREATE TABLE against the established database.
6. Run seed if the environment requires lookup restoration.
7. `npm.cmd run typecheck`
8. `npm.cmd run build`
9. Run on a separate dev port and live-test guest Resume, guest Full GCI until first evidence request, guest Financial until first evidence request, sign-in handoff, new-conversation behavior, progressive uploads, readiness blocks, 3-page Full GCI PDF, 2-page Financial-only PDF, 5-page integrated Financial PDF, My GCI persistence, and SUPPORT/admin boundaries.
