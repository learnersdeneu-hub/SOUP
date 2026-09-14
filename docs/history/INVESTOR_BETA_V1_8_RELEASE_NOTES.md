# SOUP Investor Beta v1.8 — Noodles, Premium, Payments, Notifications & Google Auth

## Student-facing counselor identity
- Student guidance counselor is now **Noodles** throughout the main conversation experience.
- Noodles is instructed to be warm, concise, decisive and human without becoming childish or repetitive.
- Noodles uses a student's name only occasionally when known and does not re-introduce itself every turn.

## SOUP Premium Counseling
- New `/premium` page and homepage Premium section, positioned after the partner ecosystem.
- Price displayed only in USD: **$54 USD one-time**.
- ChatGPT-style Free vs Premium comparison.
- Premium describes real-time human counselor access, 24 hours a day, human strategy review and managed eligible SOUP partner-university applications through submission.
- University application fees are explicitly separate from SOUP Premium.

## Payments
- New `/payments` page.
- Premium payment history and university application fee status are shown separately.
- University application fees can be recorded by admissions with amount/currency and communicated to the student.
- New persistent Payment model and statuses.
- Stripe Checkout integration via server-side REST API when `STRIPE_SECRET_KEY` is configured.
- Stripe webhook verification supported through `STRIPE_WEBHOOK_SECRET`.
- Premium activation is based on server-verified payment state, not on clicking the checkout button.

## Pending dashboard
- New `/pending` page consolidates:
  - journey/application actions,
  - documents under review,
  - Premium payment actions,
  - university application fees,
  - the student's current recommended next action.
- My SOUP dashboard now links to both Pending and Payments and exposes their counts.

## Notifications and email
- Notifications remain available at `/notifications` and are now directly accessible from the header Bell icon.
- PAYMENT notification type added.
- Premium activation, managed application start, application status changes, offers and application-fee updates can send transactional email when Resend is configured.
- Uses existing `RESEND_API_KEY` and `SOUP_EMAIL_FROM` environment settings.

## Google login/logout
- Google OAuth sign-in is integrated through Supabase Auth on Sign In and Sign Up screens.
- Existing Supabase sign-out handles both Google and email/password sessions.
- Google provider must be enabled in the production Supabase project before launch.

## External configuration required before live launch
1. Enable Google provider in Supabase Auth and configure the production redirect URLs.
2. Configure `RESEND_API_KEY` and a verified `SOUP_EMAIL_FROM` sender/domain.
3. Configure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` only when the chosen SOUP merchant entity/payment account is ready.
4. Apply the new Prisma migration before production traffic.

## Source-level verification
- 107/107 deep SOUP invariants passed.
- 27/27 investor-beta checks passed.
- 31/31 application operating-system checks passed.
- 15/15 v1.8 Premium/Auth/Payments checks passed.
- Repository consistency: 207 source files, 50 routes, 16 migrations.

A dependency-backed `npm run typecheck` and `npm run build` must still be run on the deployment machine because this build environment has no installed node_modules/npm registry access.
