# SOUP Deployment

1. Install dependencies with `npm.cmd install` on Windows.
2. Validate/apply Prisma migrations against the intended database.
3. Run `npm.cmd run verify:deploy`.
4. Start locally on port 3001 and execute the manual end-to-end checklist.
5. Configure Vercel production environment variables.
6. Verify Supabase Auth redirect URLs, Google OAuth, recovery email templates, private Storage policies, Resend sender/domain and Stripe webhook if payments are enabled.
7. Deploy only after the production build and manual two-account authorization test pass.
