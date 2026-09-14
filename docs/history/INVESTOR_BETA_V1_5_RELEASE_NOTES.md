# SOUP Investor Beta Release Candidate v1.5

This release is the pre-deployment UX/AI refinement pass requested on 12 Sep 2026.

## What changed

- Login/account gating is enforced at the moment a guest tries to upload a private counselor document or resume, and before resume/CV/cover-letter file generation. Export endpoints remain authenticated.
- Counselor prompt behavior is stricter: one focused question at a time, concise replies, explicit anti-repetition rules, no repeated recaps, and a direct recommendation/decision point once the student profile is sufficiently known.
- Suitable active SOUP partner universities are surfaced first after suitability is established. The Counselor is instructed to ask a direct application decision (for example, whether to start KEDGE/ESDES) before routine application-document collection. It broadens to independent options when partner options do not fit or the student asks for a different route.
- Routine university discovery stays SOUP-database-first and web research stays conditional for missing/current facts.
- Runtime adds a recent-assistant anti-repeat guard and uses a shorter Counselor output budget to reduce unnecessary long responses/latency.
- Counselor journey header is now compact by default. Detailed case state, SOUP activity, required student action, applications, and known data are available under a single View details control rather than permanently crowding the chat.
- Journey stages, application count and document count are clickable navigation elements.
- Homepage service cards now show partner previews/logos directly where active partner data exists. Accommodation/insurance/finance no longer appear as only conversational entry points.
- Accommodation and finance partner directories make the partner list primary and the Ask SOUP chat action secondary/optional.
- MCB Islamic Bank is shown as the confirmed banking partner even when a local environment has not yet seeded the finance partner row; transactional behavior still requires database-controlled routes.

## Automated source checks on this exact package

- Repository consistency: PASS (193 source files, 47 routes, 14 migrations)
- Deep SOUP invariants: 107/107 PASS
- Investor-beta checks: 21/21 PASS
- Migration consistency: PASS
- TypeScript/TSX syntax/transpile parse: PASS (192 files)

## Required local final gate

This environment cannot fetch npm packages from the registry, so run the normal compile gate on the deployment machine:

npm.cmd install
npm.cmd run typecheck
npm.cmd run build
npm.cmd run check:investor-beta
npm.cmd run dev

Use port 3001 for local SOUP development.
