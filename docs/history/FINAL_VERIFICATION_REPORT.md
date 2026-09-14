# SOUP Final Verification Report

Verification date: 2026-09-12

## Passed checks
- Repository consistency: PASS — 188 source files, 45 routes, 14 migrations.
- Deep product/security invariants: PASS — 107/107.
- TypeScript/TSX syntax/transpile parse: PASS — 187 files.
- Secret-pattern scan: no real API keys, Supabase secrets, or database passwords detected in the source archive.
- `.env`, `.env.local`, `.env.*.local`, `node_modules`, `.next`, logs and build artifacts are gitignored.
- Database-first Counselor policy is present in code and prompt logic.
- Live web grounding is conditional, not enabled for every Counselor request.
- Partner priority remains subordinate to suitability.
- Student-visible match percentages are blocked/sanitized.
- Document requests, document vault flow, checklist binding, application-plan binding, role scoping and distributed AI rate limits are covered by the deep checks.
- Gemini 3.7 Flash is a valid stable Gemini API model as of this verification date.

## Fix made during this final verification
- SOUP local-development URL defaults were aligned to port 3001 in `.env.example`, README and the auth fallback, matching the project's agreed local port.

## Still requires environment-backed verification on the deployment machine
The source package intentionally excludes `node_modules`. Dependency installation could not complete inside the constrained verification container, so the following must be run once on the local/deployment machine with network access:

```bash
npm install
npm run typecheck
npm run build
```

After production environment variables are added, run:

```bash
npm run verify:launch
```

These are deployment gates, not optional checks.

## Known deployment consideration
The deep-check suite reports Next.js 14.2.35 as a security-maintenance warning. Do not perform a framework major-version upgrade immediately before the investor demo without a regression pass. Plan a controlled supported-LTS upgrade after the beta deployment is stable.

## Accommodation
The UI/data layer can render structured provider inventory, but true live inventory still depends on approved API/feed/sync details from the accommodation partners. No unapproved scraping was added.
