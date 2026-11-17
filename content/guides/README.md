# SOUP guides: editorial tracker

This file is the persistent record for the SEO content programme. Update it whenever an article changes status, so work can resume without repeating anything.

Status flow: `planned` → `researched` → `drafted` → `fact-checked` → `approved` → `published`

| # | File | Target URL | Category | Primary keyword | Status | Last reviewed |
|---|---|---|---|---|---|---|
| 1 | `about-soup.md` | `/about` | Company | SOUP student admissions platform | drafted, awaiting approval | 2026-11-17 |
| 2 | `study-in-greece-english-taught-programmes.md` | `/guides/study-in-greece-english-taught-programmes` | B (Greece pillar) | study in Greece for international students | drafted, awaiting approval | 2026-11-17 |
| 3 | `study-in-europe-after-a-levels.md` | `/guides/study-in-europe-after-a-levels` | A → B bridge | study in Europe after A-levels | drafted, awaiting approval | 2026-11-17 |
| 4 | `university-application-document-checklist.md` | `/guides/university-application-document-checklist` | F | university application documents checklist | drafted, awaiting approval | 2026-11-17 |
| 5 | `hospitality-tourism-degrees-europe-diploma-graduates.md` | `/guides/hospitality-tourism-degrees-europe-diploma-graduates` | B (vocational pathway) | hospitality management degree in Europe for international students | drafted, awaiting approval | 2026-11-17 |
| 6 | `reuse-information-across-university-application-portals.md` | `/guides/reuse-information-across-university-application-portals` | F (Companion) | university application autofill | drafted. **Blocked until the new Companion build ships** (see the file's review notes) | 2026-11-17 |

## Rules every article follows

- Each file's front matter holds the SEO title, meta description, keywords, intent, audience, slug, dates, image brief and alt text.
- No invented fees, deadlines, rankings, scholarship amounts or partner relationships. Fast-changing facts link to the official source and carry a "last reviewed" date.
- `review_notes` in the front matter lists what an editor must confirm before publishing.
- Internal links point to existing SOUP routes (`/universities`, `/counselor`, `/premium`, `/services/insurance`, `/services/accommodation`, `/companion/connect`, `/sign-up`) and to other guides at `/guides/<slug>`.

## Technical blockers to publishing (from the audit)

1. **The whole site is behind sign-in.** `src/middleware.ts` redirects every visitor who isn't signed in to `/sign-in`, except for a short `PUBLIC_PATHS` list. That includes the homepage. Search engines cannot crawl any page today. `/about` and `/guides` must be added to the public paths before anything can rank.
2. **There is no article route, sitemap or robots file yet.** The site has no `/guides` route, `sitemap.ts` or `robots.ts`, and only the site-wide `<title>` and description in `src/app/layout.tsx`. A guides template needs canonical, Open Graph, Article/FAQ/Breadcrumb structured data and per-page metadata.
3. **Analytics and Search Console.** No Search Console verification or conversion events were found. They are needed before any performance reporting.
