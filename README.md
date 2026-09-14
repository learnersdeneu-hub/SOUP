# SOUP — AI International Student Journey Platform

This repository is the production SOUP fork built from the final tested GCI.ai engineering and interaction benchmark.

**GCI.ai and SOUP are separate products.** The fork deliberately reuses the mature GCI chat shell, history model, authentication/storage patterns, document pipeline, PDF generation and dashboard architecture, but SOUP has its own student-journey domain, AI Counselor, partner catalog and commercial workflows.

## Product rule

The primary interface is the **SOUP Student Counselor**. Students should be able to speak naturally and continue one persistent journey across:

- university and program discovery
- SOUP partner and independent university recommendations
- applications and offer letters
- contextual document collection and a reusable document vault
- visa and pre-departure checklists grounded in current official sources
- accommodation
- student insurance
- scholarships
- student finance
- Resume & Cover Letter

The Counselor is the intelligence layer across these services. Structured cards/actions appear inside conversation only when they are relevant.

## Partner and recommendation boundary

SOUP must not confuse commercial priority with academic suitability.

- The Counselor researches what genuinely fits the student's profile and chosen geography.
- Suitable active SOUP partners can be presented first.
- Public/non-partner options remain available as independent recommendations.
- Student-facing university match percentages are prohibited.
- `Apply through SOUP` is available only for active SOUP university partners.
- Non-partner/public applications are advisory/external unless a future authorized assisted service is explicitly configured.
- Insurance purchased through SOUP uses the configured active insuremart / Hellenic Sun partner channel; wider-market insurance advice can still be given.
- Accommodation, finance and scholarship transactions similarly require active SOUP partner inventory.

## Technical foundation

- Next.js + React + TypeScript
- PostgreSQL / Supabase database
- Prisma schema and additive migration history
- Supabase Auth and private document Storage
- Gemini through a provider-neutral AI interface
- Google Search grounding for current Counselor research
- persistent server-side conversations/history
- AI-assisted document extraction with explicit authority/verification boundaries
- versioned University Application Plans and PDF export
- application, offer, checklist, referral, customer-dashboard and admin-CRM workflows

## Hard infrastructure separation

**Never connect this repository to the production GCI Supabase project.**

SOUP needs its own:

1. Supabase project and PostgreSQL database
2. Supabase Auth users/configuration
3. private `documents` storage bucket with the user-folder RLS policies in `docs/SUPABASE_STORAGE_SETUP.sql`
4. database password and connection strings
5. public/secret Supabase keys
6. Gemini key/configuration as appropriate
7. deployment project and environment variables
8. production domain

Copying architecture does not mean sharing production state.

## Local environment

Copy `.env.example` to `.env.local` and enter the values for the **new SOUP environment**.

Required for the main local journey:

```env
DATABASE_URL="...SOUP database..."
DIRECT_URL="...SOUP database..."
NEXT_PUBLIC_SITE_URL="http://localhost:3001"
NEXT_PUBLIC_SUPABASE_URL="https://...SOUP project....supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SECRET_KEY="...server only..."
AI_PROVIDER="gemini"
AI_MODEL="gemini-3.8-flash"
GEMINI_API_KEY="...server only..."
SOUP_ADMIN_EMAILS="owner@example.com"
```

Optional transactional email:

```env
RESEND_API_KEY=""
SOUP_EMAIL_FROM="SOUP <notifications@your-domain.example>"
```

Never expose secret keys through `NEXT_PUBLIC_*` and never commit `.env.local`.

## Windows / VS Code validation gate

From the folder containing this README and `package.json`:

```powershell
npm.cmd install
npm.cmd run check:repo
npm.cmd run check:migrations
npm.cmd run check:deep
npm.cmd run check:syntax
npm.cmd run check:ai
npm.cmd run prisma:validate:local
npm.cmd run prisma:status:local
npm.cmd run typecheck
npm.cmd run build
```

Do **not** run database migrations blindly. First confirm that `DATABASE_URL` / `DIRECT_URL` point to the new SOUP database and review migration status.

For a brand-new empty SOUP database, the repository migration history can then be applied in order:

```powershell
npm.cmd run prisma:deploy:local
npm.cmd run seed
npm.cmd run seed:soup-partners
```

Then:

```powershell
npm.cmd run dev
```

## Minimum live QA before deployment

Test with real SOUP credentials/data. Before the journey, run `npm.cmd run check:preflight` and confirm `/api/health` reports the database reachable.

1. guest Counselor conversation → account creation → conversation continues
2. student gives academic background + degree/subject + region/worldwide preference
3. Counselor narrows geography when useful and produces no visible match percentage
4. live university research produces grounded/clickable sources
5. save/version/download University Application Plan
6. partner university → start SOUP-managed application
7. independent university → advisory/official external route only
8. Counselor requests one relevant document → upload → AI reads → document vault persists it
9. reopen conversation and verify history/source attribution persists
10. admissions staff prepares/refreshes the official application-requirements checklist, reviews supplied files, and cannot submit until current required items are accepted
11. Counselor/support can inspect application cases but cannot perform admissions mutations
12. staff uploads an offer letter (including conditional-offer path) and the application event ledger records the operation
13. student receives offer in vault/dashboard and journey stage advances
14. visa checklist is generated from current official sources and saved
15. checklist document is attached one item at a time; UI never calls it embassy approval
16. insurance advice can be broad; SOUP purchase goes only through configured active insurance partner
17. accommodation/finance/scholarship SOUP transactions require active partner inventory
18. partner catalog search/filter/pagination works beyond 500 records and only Admin/Super Admin can mutate commercial routes
19. mobile/Fold-style keyboard, composer, sidebar and upload behavior
20. admin case CRM correctly scopes each student's applications, documents, plans, referrals, application history and conversation history

## Production gates

The final GCI benchmark was pinned to Next.js `14.2.35`. The SOUP conversion intentionally does not combine a major framework migration with the business-domain rewrite. Before public production deployment, perform a controlled upgrade to a currently supported/patched Next.js line and rerun the full regression/build/security QA.

Also complete production observability, backup/restore validation, error monitoring, and load/security testing before scaling traffic. SOUP now includes a PostgreSQL-backed AI request limiter; tune its limits from real traffic/cost data after launch.

## Partner data

`data/replit-partnered-university-programs.csv` is retained as an importable subset from the Replit SOUP prototype. It is **not** assumed to represent the complete commercial network. Use `npm run seed:soup-partners` for the included data, then import the authoritative full partner inventory through the same Partner/University/Program model.

## Historical GCI reference

Inherited root-level GCI build notes have been moved to `docs/gci-benchmark-root/`. They are reference material only and are not SOUP startup instructions.

### Importing the full SOUP partner network

`data/SOUP_PARTNER_IMPORT_TEMPLATE.csv` is the normalized bulk-import format for the authoritative partner network. Populate it from SOUP's live partner records and run:

```powershell
npm.cmd run import:soup-catalog -- data/your-partner-catalog.csv
```

University rows can be repeated for multiple programs. Non-university partner rows leave the program columns blank. The importer validates the entire CSV before writing; active non-university partners must have an authorized `transaction_url`, otherwise keep them `PAUSED`. Database upserts are idempotent, so a database/network interruption can be corrected and the same validated file rerun. Importing a catalog does not make non-partner public recommendations transactional; the Counselor can still research those independently from current official sources.
