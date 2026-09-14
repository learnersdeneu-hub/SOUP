# End-to-end tests

Two tiers, deliberately separated:

## 1. Smoke tests (`smoke.spec.ts`) — run these anywhere

No seeded account needed. They check the app boots, the health endpoint
responds, the sign-in form renders, and protected routes correctly reject
unauthenticated requests. Safe to run in CI against a preview deployment with
only placeholder secrets.

```bash
npm run test:e2e
```

## 2. Authenticated flow tests (`student-application-flow.spec.ts`) — need a real seeded account

These need an actual Supabase Auth user that exists in a real (ideally
disposable/staging) project, because there's no way to fabricate a valid
session without a real auth provider round-trip.

To run them for real:

1. In a staging or disposable Supabase project (never production), create a
   student test account through the normal sign-up flow and complete
   onboarding so a `Profile` row exists.
2. Set:

```bash
export E2E_BASE_URL="https://your-staging-deployment.example.com"
export E2E_STUDENT_EMAIL="e2e-student@example.invalid"
export E2E_STUDENT_PASSWORD="…"
```

3. Run:

```bash
npm run test:e2e
```

Without `E2E_STUDENT_EMAIL`/`E2E_STUDENT_PASSWORD` set, these tests report as
**skipped**, not passed — a skip here means "not verified," and should be
read that way rather than as a green check mark.

## Why this isn't in `verify:deploy`

`verify:deploy` must stay deterministic and runnable with zero external
credentials, so it can gate every PR automatically. The authenticated e2e
tier needs a real staging environment and a real seeded user, so it belongs
in a separate, manually-triggered or nightly CI job — wire it up once a
staging deployment exists to point `E2E_BASE_URL` at.
