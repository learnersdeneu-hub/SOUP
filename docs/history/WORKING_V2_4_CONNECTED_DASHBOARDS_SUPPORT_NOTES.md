# SOUP Working v2.4 — Connected Dashboards + Support

## Student dashboard
- Rebuilt around three questions: where am I, what do I need to do, what is SOUP handling.
- One primary next action instead of a wall of equal-weight cards.
- Connected journey rail from Profile through Arrived.
- Student-action queue and SOUP-handling queue.
- University workspace shows latest matches, active/final choices and offers.
- Documents, applications, payments, notifications and support are surfaced as connected case modules.
- Service/partner activity appears in the same case workspace.
- SOUP Concierge cases receive a dedicated high-touch status section.
- Assigned counselor is shown when the case has one.

## Shortlist connectivity
- Added persistent shortlist decisions: Keep, Remove and Final 3.
- Finalist selection is capped at three.
- Noodles receives the same saved shortlist decision state through counselor context, so removed universities do not have to be rediscovered from chat history.
- Added university comparison page with program, tuition, intake, route, eligibility and rationale.
- Added Ask Noodles compare/why handoffs using the saved counselor thread entry path.

## Internal dashboard
- Rebuilt as a role-scoped operations command centre.
- Priority queues: Ready to submit, Waiting on student, Waiting on university, Document review, Support, Concierge cases.
- Deadline-within-seven-days counter.
- Recently updated applications and latest student cases.
- Existing role permission boundaries preserved.
- Student CRM now includes a unified timeline combining application events, notifications, payments and support activity.

## Support
- Support entry added to the main header.
- Floating support launcher added to homepage and My SOUP.
- Homepage now contains a dedicated Help section.
- WhatsApp redirects to +48 739 654 618 using wa.me.
- Help email is admissions@learnerden.eu.
- Creating an account-linked support ticket creates immediate internal SOUP notifications for active Admin/Super Admin/Support profiles.
- If Resend is configured, new tickets also send an immediate email alert to admissions@learnerden.eu.
- Student replies on support tickets also email the help inbox when Resend is configured.
- Support page now covers admissions, applications, documents, payments, visa, accommodation and account issues.

## Database
- Migration 17 adds `studentDecision` and `studentDecisionAt` to UniversityShortlistItem.

## Verification performed in assistant environment
- Repository consistency: PASS — 212 source files, 51 routes, 17 migrations.
- Migration consistency: PASS — 17 migrations.
- Syntax/transpile parse: PASS — 211 TypeScript/TSX files.
- Deep SOUP invariants: PASS — 107/107.
- Application OS checks: PASS — 31/31.
- AI readiness checks: PASS — 10/10.
- University catalog checks: PASS — 296 institutions / 299 program records.

Full dependency-backed `npm run typecheck` and `npm run build` still require the local install/environment with node_modules and the real env configuration before this package can be called deployment-final.
