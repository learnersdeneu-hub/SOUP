# v1.8 Go-Live Setup

Run from the SOUP project root:

```cmd
npm.cmd install
npm.cmd run prisma:validate:local
npm.cmd run prisma:deploy:local
npm.cmd run typecheck
npm.cmd run build
npm.cmd run check:deep
npm.cmd run check:investor-beta
npm.cmd run check:application-os
node scripts/v18-release-check.mjs
npm.cmd run dev
```

## Google login
Enable Google in Supabase Dashboard -> Authentication -> Providers -> Google. Add the correct Google OAuth client credentials and make sure the production SOUP URL is allowed in Supabase redirect URLs. The app callback remains `/auth/callback`.

## Email
Set:
- `RESEND_API_KEY`
- `SOUP_EMAIL_FROM`

The FROM address/domain must be verified with the email provider.

## Premium payment checkout
Set only when a valid Stripe merchant account is available:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Webhook endpoint:
`/api/payments/stripe/webhook`

Premium is USD-only in the UI and currently priced at $54 one-time. University application fees are separate and are managed through each application record.
