# SOUP Testing Strategy

`npm test` runs the automated Vitest suite. Current layers include request-schema tests, API authorization-structure tests, and client secret-boundary tests. The release gate also retains SOUP-specific lifecycle, catalog, AI, experience and deployment checks.

Before production, browser-level functional testing must cover guest counseling, login, shortlist/final-3, managed applications, document upload/review, staff updates, submission, offers, visa, support, password recovery, Google OAuth, payments when enabled, two-account isolation and mobile layouts.

`npm run verify:deploy` is the final local code gate and includes tests, auth audit, type-safety regression budget, product invariants, Prisma validation, TypeScript and `next build`.
