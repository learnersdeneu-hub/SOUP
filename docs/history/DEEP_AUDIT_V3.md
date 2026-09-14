# GCI.ai Sprint 1.5 — Deep QA / Debug Pass V3

Date: 2026-08-08

## Scope

This pass re-audited the corrected Sprint 1.5 repository after the prior nine audit corrections. It focused on regressions introduced by the conversational rebuild, guest/account handoffs, saved resume access, AI control-state behavior, evidence/report boundaries, database/migration consistency, security scoping, and configuration.

## Executed checks

- ZIP extraction: PASS
- `node scripts/repo-check.mjs`: PASS
- `node scripts/deep-check.mjs`: PASS (16/16 invariants; framework-version warning noted below)
- TypeScript/TSX parser pass: PASS — 119 files, 0 syntax diagnostics
- Prisma schema-to-migration table coverage: PASS — 57 mapped tables represented
- Duplicate `CREATE TABLE` identifiers: PASS — none
- Duplicate `CREATE TYPE` identifiers: PASS — none
- Secret-literal scan: PASS — no OpenAI secret/service-role style literals found
- Guest route gate scan: PASS — `/resume`, `/report`, `/financial`, `/resume/improve` have no immediate sign-in redirect
- Readiness pure-function behavioral cases: PASS for empty, insufficient, duplicate-type, sufficient GCI evidence; PASS for empty/property/integrated Financial cases
- npm dependency install in this sandbox: NOT EXECUTABLE — sandbox registry returns 404 for legitimate `@anthropic-ai/sdk`, so Prisma generation/typecheck/Next build remain Dell QA gates

## Additional bugs found and fixed in this pass

### 1. New-conversation UI state could retain old evidence controls
After a Report/Financial conversation had entered evidence mode, resetting the conversation cleared messages/server session but parent state could remain `evidenceRequested=true`, leaving upload/sign-in controls visible in the new conversation.

**Fixed:** ConversationWorkspace now has an `onReset` hook; Report/Financial clear evidence state, snapshot and notices on reset. Their message handlers also recompute evidence state rather than only ever turning it on.

### 2. Resume generation was still based on a fixed number of turns
The conversational Resume UI showed the generation card after three user turns regardless of whether AI had gathered enough useful information.

**Fixed:** the Resume system prompt now emits `[[READY_TO_FINALIZE]]` only when sufficient information exists. The UI exposes generation only when that AI readiness signal is present.

### 3. Resume signup handoff did not automatically continue generation
A guest who reached Resume generation and created an account returned to `/resume?generate=1`, but the new conversational page did not consume that flag.

**Fixed:** the server page passes an `autoGenerate` flag and the client generates once the signed-in transcript has been restored and the readiness token is present.

### 4. Improve Resume guest→account handoff was broken
Guest Resume Import stored the analyzed draft, but redirected to `/resume?claim=1`; Sprint 1.5 had replaced `/resume` with the conversational builder, so the pending converted resume was no longer recovered.

**Fixed:** the handoff now returns to `/resume/improve?claim=1`, ResumeImport restores the pending local draft after authentication, and successful save clears it.

### 5. Saved resume editing/version history became inaccessible
Sprint 1.5 correctly replaced `/resume` with the modern conversational builder, but the previous field editor/version UI had been attached to the old `/resume` page. Links such as Resume Intelligence "Edit this resume" therefore opened a new conversation instead of the saved resume.

**Fixed:** added protected `/resume/manage`, backed by the existing ownership-checked save/version actions. Existing edit/history links and notifications now point there. The manager is placed in manage-only mode so it does not re-expose the old boxed creation workflow.

### 6. My GCI's "My Resume" link could open a new builder instead of the saved resume
**Fixed:** when the account already has a resume, My GCI routes "My Resume" and "Review your resume" to `/resume/manage`; users with no resume still go to the conversational `/resume` builder.

### 7. Financial conversation could override the user's explicit report mode
The message handler scanned the full transcript on every change. If a user had ever said "integrated" and later manually chose Financial-only, subsequent messages could force the mode back to Integrated.

**Fixed:** mode inference happens only before a mode has been chosen; explicit user selection/server preference then wins and persists.

### 8. Database example still encouraged a guessed/old pooler hostname pattern
**Fixed:** `.env.example` now instructs developers to copy the current Supabase Connect string and uses a neutral `[session-pooler-host]:5432` placeholder rather than hardcoding an AWS region pattern.

## Previously fixed items re-verified

- OpenAI is the default AI provider.
- Customer-facing AI errors do not expose provider/API-key details.
- New signed-in conversation archives previous IN_PROGRESS sessions server-side.
- Guest transcript migration no longer silently loses new guest work when an older session exists.
- Full GCI/Financial account controls appear only after AI emits `[[EVIDENCE_REQUESTED]]`.
- Full GCI readiness gate exists.
- Financial readiness gate exists.
- Financial-only vs Integrated mode is explicitly persisted.
- Full GCI export is a real 3-page PDF route.
- Financial exports are real 2-page/5-page PDFs.
- CustomerContext is framed as untrusted reference data in system prompts.
- SUPPORT document listing and signed-document access are scoped to assigned customers.
- Guest Resume, Full GCI, Financial, and Improve Resume entry pages are public.

## Current production-security finding

The project is still pinned to Next.js 14.2.35. As of July/August 2026, Vercel's supported security lines are Next.js 15.5.x (Maintenance LTS) and 16.2+/16.3 (Active LTS/current), and the July 2026 security release directs users to patched 15.5.21 or 16.2.11 for multiple HIGH/MEDIUM issues.

This pass **did not blindly perform the major framework/React migration** because this sandbox cannot install dependencies or run the real production build. Treat a controlled Next.js upgrade as a production-security gate to execute and validate on the Dell (or another unrestricted CI environment) before deployment.

## Remaining Dell execution gate

Run in the new project copy with the real `.env.local`:

1. `npm.cmd install`
2. `npm.cmd run check:repo`
3. `npm.cmd run check:deep`
4. `npm.cmd run prisma:validate:local`
5. `npm.cmd run prisma:status:local`
6. Apply only pending additive Sprint 1.5 migrations after reviewing status
7. `npm.cmd run typecheck`
8. `npm.cmd run build`
9. Configure/test `AI_PROVIDER=openai`, `OPENAI_API_KEY`, and selected supported model
10. Start on a separate dev port and perform full live UX QA

## Live acceptance journeys

- Guest Resume conversation → AI readiness → account → automatic continuation → resume/cover letter → `/resume/manage` editing/versioning
- Guest Improve Resume upload → free analysis → account → pending draft restored → save → manage/intelligence
- Guest Full GCI → AI asks for evidence → account → repeated document processing → readiness gate → 3-page PDF
- Guest Financial → mode choice → AI asks for evidence → account → property/financial evidence → readiness gate → correct 2-page or 5-page PDF
- New conversation → old server/local state does not reappear
- My GCI → saved resume management, documents, notifications, report/financial continuation
- ADMIN vs SUPPORT document access and review boundaries
- Fold 5 mobile layout and keyboard/composer behavior

## Verdict

**PASS FOR DELL BUILD + LIVE QA, with one explicit production-security gate: controlled Next.js supported-LTS upgrade before deployment.**

Sprint 2 remains untouched.
