# SOUP Security Baseline

## Authorization

SOUP uses centralized API user/staff guards plus row ownership constraints on Prisma queries. The deployment verification suite includes a structural test that rejects new protected API routes without a recognized auth guard.

## Database and RLS

Prisma uses a trusted server database connection, so Postgres RLS is not treated as the only application-data authorization boundary. Supabase Auth and Storage RLS remain mandatory. A future move to per-request database roles/RLS must be designed deliberately rather than bolted onto Prisma immediately before launch.

## Secrets

Only `NEXT_PUBLIC_*` values may be referenced by client bundles. Gemini, database, Stripe, Resend and Supabase secret/service-role credentials are server-only. Automated tests scan client components for private secret names.

## Student files

Student uploads must remain in private buckets. Access must require ownership/staff authorization and short-lived signed URLs. Never expose storage service credentials or permanent private object URLs.
