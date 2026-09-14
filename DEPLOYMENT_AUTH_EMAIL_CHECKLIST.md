# SOUP Production Auth & Email Checklist

Use this checklist when moving the frozen v2.7 deployment candidate to Vercel/Supabase production. Do not place real secrets in this file or commit `.env.local`.

## Supabase Auth

- Set the Supabase **Site URL** to the final SOUP production origin (for example `https://your-domain.example`).
- Add allowed redirect URLs for the production origin and local development (`http://localhost:3001`).
- Confirm the OAuth callback route is reachable at `/auth/callback`.
- Keep email/password sign-in enabled if SOUP will support it.
- Confirm email confirmation behavior matches the launch policy.
- Test new-account confirmation from a real mailbox.
- Test **Forgot password → email → callback → choose new password → sign in** end-to-end.
- Configure a production SMTP provider in Supabase Auth so confirmation/recovery messages do not depend on development/default sending limits.
- For Google sign-in, configure the Google provider and the callback URL shown by Supabase, then test both first-time and returning users.

## SOUP transactional email (Resend)

Supabase Auth email and SOUP transactional email are separate systems.

Set these server-side variables in Vercel:

- `RESEND_API_KEY`
- `SOUP_EMAIL_FROM` — must use a sender/domain verified by the email provider.
- `SOUP_SUPPORT_EMAIL=admissions@learnerden.eu`

Test real delivery for:

- application started
- material application status change
- offer/decision recorded
- application fee update
- SOUP Plus/Concierge activation
- support request/escalation

Check spam/junk placement and make sure emails contain no internal notes or provider/debug payloads.

## Public vs private variables

Public/client-safe only:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SOUP_WHATSAPP`

Server-only:

- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `DIRECT_URL`
- `GEMINI_API_KEY`
- `SOUP_RATE_LIMIT_SALT`
- `RESEND_API_KEY`
- `SOUP_EMAIL_FROM`
- `SOUP_SUPPORT_EMAIL`
- Stripe secret/webhook variables

Never rename a private key with a `NEXT_PUBLIC_` prefix.

## Final acceptance test

1. Create a fresh student account.
2. Confirm the account email if enabled.
3. Sign out and sign back in.
4. Request a password reset.
5. Open the real recovery email in a second browser/incognito window.
6. Choose a new password.
7. Confirm the temporary recovery session is signed out and the user is returned to Sign In.
8. Sign in with the new password.
9. Test Google OAuth independently.
10. Trigger one SOUP transactional email and confirm delivery.
