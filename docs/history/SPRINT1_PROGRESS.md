# Sprint 1 — GCI Passport Foundation

## Coding status

Sprint 1 customer-platform coding is complete for the agreed scope. The remaining gate is local verification on a normal npm registry and the live Supabase project before Sprint 2 begins.

## Implemented

### Authentication and account foundation
- Supabase sign-up, sign-in, sign-out, email confirmation and password reset.
- Idempotent `User`/`Profile` provisioning using the Supabase Auth UID.
- Self-healing provisioning for authenticated users whose Prisma profile was not created previously.
- `CUSTOMER`, `SUPPORT` and `ADMIN` roles with server-side role guards.
- Customer account settings page.
- Guest resume handoff to account creation via browser-local pending draft storage.

### Customer dashboard
- Real profile completeness, latest scores, credential counts, document counts and notifications.
- Navigation to Resume, Resume Intelligence, Opportunity Hub, Documents, Reports, Learn, GCI AI, Downloads, Support and Account Settings.
- Real recommended-next-step logic using saved resume, goal, documents and verification state.

### Resume system
- Public Resume Builder with no sign-in required to begin.
- Student, Graduate, Professional, International Student and Job Seeker structures.
- AI-assisted factual resume generation plus a 100–300 word cover letter.
- Optional customer-supplied portrait.
- Two-page resume PDF and separate cover-letter PDF without GCI watermark/branding.
- Persistent Resume records and immutable ResumeVersion snapshots.
- Field-level resume editing and version restore UX.
- Resume history/download workspace.
- Resume import for PDF, DOCX, PNG, JPG and JPEG; OCR for images.
- Imported-resume conversion to the GCI structure.

### Resume Intelligence
- Deterministic, explainable Resume Health analysis.
- ATS-readiness foundation, evidence/impact and role-targeting checks.
- Strengths, missing sections and prioritized recommendations.
- Free teaser limited to top recommendations.
- 30/90/180-day roadmap checkpoints.
- Premium-ready deeper surfaces without implementing billing or fabricating outcomes.

### Career goals, opportunities and AI coach
- Persistent primary career goal covering internship, job, university, scholarship, competition and career growth.
- Provider-agnostic Opportunity Engine boundary.
- No fabricated fallback listings; opportunities require a source/provider, external ID and URL.
- Goal Readiness based on real goal + resume signals, explicitly not a hiring/admission prediction.
- GCI AI Career Coach grounded in resume, goal, Resume Intelligence, roadmap, credentials, verification and GCI profile context.

### Documents and notifications
- Secure customer Documents center.
- Upload, pending review, more-info-required, approved, rejected and expired states.
- Short-lived signed document preview URLs.
- Document review reasons and permanent review-event history.
- Customer and staff in-app notifications with read/unread state and mark-all-read.

### Customer support and internal operations
- Customer support tickets, replies and history.
- Staff assignment, status transitions and staff-only internal ticket notes.
- Admin/support dashboard with real metrics.
- User search and user detail workspace.
- Staff-only internal user notes.
- Document review queue with request-more-info, reject and admin-only approval.
- Real document-review audit trail.
- Runtime configuration-presence page that never renders secret values.

### Security / integration cleanup
- Customer ownership checks for documents, chat sessions, resumes and notifications.
- Admin/support role guards for internal routes and actions.
- Arbitrary document-status query values are rejected rather than passed directly into Prisma enums.
- Removed the obsolete `fullTextSearchPostgres` Prisma preview feature.
- Prisma CLI/client pinned together at 5.22.0.
- Next.js pinned to patched 14.2.35.
- Added `typecheck` and `verify` npm scripts.
- Static route-reference check: no known internal route points to a missing page.
- Static `@/` import check: no known local import points to a missing source file.
- TypeScript parser-level syntax check: no TS1xxx syntax errors found.

## Deliberately not Sprint 1
- GCI Report final 3-page commercial format.
- Financial & Valuation final 5-page commercial format.
- Official verified PDF entitlement/payment flows.
- Live jobs/internships/scholarships/competition provider integrations.
- Premium billing and subscription entitlements.
- Organization/university/employer/bank portal and maker-checker console.
- Final approved GCI scoring methodology (current score formula remains provisional and disclosed).

## Verification still required before Sprint 2

The execution environment used to assemble this checkpoint cannot install all project dependencies because its internal npm mirror does not contain packages including `@anthropic-ai/sdk` and `@google/generative-ai`. Therefore a real Prisma generation, TypeScript typecheck and Next.js production build must be run on the user's laptop with the normal npm registry.

Use `SPRINT1_QA.md` for the exact order. Do not start Sprint 2 until those checks and the manual flows pass.
