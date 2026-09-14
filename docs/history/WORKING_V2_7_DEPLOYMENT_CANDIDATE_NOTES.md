# SOUP Working v2.7 — Deployment Candidate / Frozen Baseline

This release is the long-lived baseline after the v2.6 feature freeze. Future work should be applied as focused patches against this codebase rather than rebuilding SOUP from scratch.

## CTO cleanup completed

- Reworked university directory and individual university pages around current, non-invented catalog data.
- University pages now surface logo/fallback, location, SOUP Application Network status, fee range, current intakes, study levels, active program count, program fees/intakes/durations/deadlines, source freshness, official website, and a live-verification path through Noodles when current data is missing.
- Historical program rows marked for refresh remain hidden from students.
- Added safer university-logo fallback using known official sites / website favicon with initials fallback.
- Hardened small-screen shell: mobile header, support launcher, counselor/resume full-height workspaces, top action bars, long message wrapping and global horizontal-overflow protections.
- Pricing comparison is horizontally scrollable on narrow phones instead of clipping/crowding.
- Removed loose `any` typing from the plan/payment detection touched in this pass.
- Hardened sign-in, sign-up, Google OAuth error handling, forgot-password and reset-password flows.
- Recovery requests use enumeration-safe wording. Successful password reset signs out the recovery session and returns to sign-in with a success state.
- Added consistent SOUP branding to auth/recovery pages.
- Added production auth/email deployment checklist and internal runtime-configuration status page.
- Reduced sensitive server logging and removed AI usage debug logging containing profile/session identifiers.
- Added branded 404/recovery page.
- Added deployment-candidate static QA covering routes, env documentation, secret/client boundaries, password recovery wiring, university page requirements, shell/mobile safety and brand assets.

## Source-level QA at release creation

Run these from the repository root:

- `npm run check:syntax`
- `npm run check:repo`
- `npm run check:migrations`
- `npm run check:deep`
- `npm run check:application-os`
- `npm run check:university-catalog`
- `npm run check:ai-readiness`
- `npm run check:experience-hardening`
- `npm run check:deploy-candidate`

The exact pass counts are recorded in `SOUP_BUILD_STATUS.md` after the final pass.

## What is deliberately NOT claimed

This environment could not complete dependency installation, so this release is a **deployment candidate**, not yet a deployment-certified build. A real dependency-backed `typecheck`, `next build`, migrations against the target database, browser/runtime testing, OAuth, email delivery, Stripe and end-to-end multi-user authorization testing still need to pass on the launch environment.
