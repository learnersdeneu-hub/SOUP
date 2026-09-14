# SOUP Architecture

SOUP is a Next.js App Router application backed by Supabase Auth/Storage, Postgres via Prisma, and server-side Gemini integration.

## Boundaries

- Client components render UI and submit typed requests. They never import privileged Supabase, database, payment, email, or Gemini credentials.
- Route handlers and server actions authenticate first, validate untrusted input, enforce ownership/role checks, then call domain/database services.
- Prisma is the trusted server data layer. Because Prisma does not automatically inherit Supabase RLS claims, authorization is enforced in server code and guarded by automated route/security tests.
- Supabase private storage must use RLS/private buckets and signed access for student documents.
- Gemini is server-only and receives minimized case context. Internal staff notes and private file URLs are excluded from AI context.

## Request flow

request → auth guard → Zod validation → ownership/role check → domain operation → database/provider → safe response → audit/notification where required

## AI flow

student message → auth/guest policy → rate limit → Zod validation → minimized context → Gemini → structured/safety checks → persistence → streamed response
