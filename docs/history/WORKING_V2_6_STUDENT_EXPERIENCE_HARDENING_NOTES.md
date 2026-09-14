# SOUP Working v2.6 — Student Experience & Operations Hardening

This remains a working build, not the deployment-final build.

## Added in v2.6
- Dedicated Visa Command Centre tied to saved offers and VISA journey checklists.
- Offers & Decisions centre with explicit conditional-offer tracking.
- Persistent offer-condition model and staff controls.
- Student-visible SOUP submission evidence/reference/timestamp after confirmed submission.
- SOUP Concierge counselor-session request, scheduling, assignment, meeting-link and completion workflow.
- Staff counselor-session queue and Concierge priority queue.
- Human-counselor escalation from Support with staff notifications + email alert.
- University/program source-freshness badges and Noodles freshness rules.
- Communication preferences saved in Profile and respected for lifecycle email delivery.
- Expanded application-fee lifecycle: STUDENT_PAYING, SOUP_PAYING, REFUNDED.
- Refund/payment-dispute and complaint escalation categories in Support.
- Accommodation brief capture stored in the shared student case/service workflow.
- Insurance brief capture stored in the shared student case/service workflow.
- Saved service preferences are included in Noodles context so the student is not re-interviewed.
- Admin funnel analytics page.
- Global loading and recoverable error states.
- Dashboard integration for Offers, Visa and next Concierge counselor session.

## Verification completed in this environment
- 20/20 experience-hardening checks passed.
- 107/107 deep SOUP invariants passed.
- 31/31 Application OS checks passed.
- 10/10 AI readiness checks passed.
- University catalog check passed (296 institutions / 299 program rows).
- Repository consistency passed (226 source files / 57 routes / 18 migrations).
- Syntax/transpile parse passed for 225 TypeScript/TSX files.

## Still requires the user's real environment before deployment-final
- `npm.cmd install`
- `npm.cmd run prisma:validate:local`
- `npm.cmd run prisma:deploy:local`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- real Supabase/Gemini/Resend/Google OAuth functional walkthrough on port 3001
- mobile/browser QA
- production WhatsApp Business automation if desired (the existing WhatsApp redirect works without it)
- backup/restore policy and production operations configuration
