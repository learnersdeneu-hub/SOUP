# SOUP guides: editorial tracker

This file is the persistent record for the SEO content programme. Update it whenever an article changes status, so work can resume without repeating anything.

Status flow: `planned` → `researched` → `drafted` → `fact-checked` → `approved` → `published`

| # | File | Target URL | Category | Primary keyword | Status | Last reviewed |
|---|---|---|---|---|---|---|
| 1 | `about-soup.md` | `/about` | Company | SOUP student admissions platform | **published 2026-11-18** | 2026-11-18 |
| 2 | `study-in-greece-english-taught-programmes.md` | `/guides/study-in-greece-english-taught-programmes` | B (Greece pillar) | study in Greece for international students | **published 2026-11-18** | 2026-11-18 |
| 3 | `study-in-europe-after-a-levels.md` | `/guides/study-in-europe-after-a-levels` | A → B bridge | study in Europe after A-levels | **published 2026-11-18** | 2026-11-18 |
| 4 | `university-application-document-checklist.md` | `/guides/university-application-document-checklist` | F | university application documents checklist | **published 2026-11-18** | 2026-11-18 |
| 5 | `hospitality-tourism-degrees-europe-diploma-graduates.md` | `/guides/hospitality-tourism-degrees-europe-diploma-graduates` | B (vocational pathway) | hospitality management degree in Europe for international students | **published 2026-11-18** | 2026-11-18 |
| 6 | `reuse-information-across-university-application-portals.md` | `/guides/reuse-information-across-university-application-portals` | F (Companion) | university application autofill | drafted. **Blocked until the new Companion build ships** (see the file's review notes) | 2026-11-17 |

## Rules every article follows

- Each file's front matter holds the SEO title, meta description, keywords, intent, audience, slug, dates, image brief and alt text.
- No invented fees, deadlines, rankings, scholarship amounts or partner relationships. Fast-changing facts link to the official source and carry a "last reviewed" date.
- `review_notes` in the front matter lists what an editor must confirm before publishing.
- Internal links point to existing SOUP routes (`/universities`, `/counselor`, `/premium`, `/services/insurance`, `/services/accommodation`, `/companion/connect`, `/sign-up`) and to other guides at `/guides/<slug>`.

## How to preview and publish

1. **Preview:** staff can open **Admin → Guides (editorial preview)** (`/admin/guides`). Every article renders in the real page template, with its status and review notes shown above it. Drafts are never public: their public URL returns 404, and they are left out of the sitemap.
2. **Approve and publish:** in the article's front matter, set
   ```
   status: "published"
   publication_date: "YYYY-MM-DD"
   ```
   and update `last_reviewed`. Then merge and deploy. The guide goes live at its URL, joins `/guides` and the sitemap, and gets Article, Breadcrumb and FAQ structured data.
3. **Scheduling:** a guide goes live at the **first deploy on or after its `publication_date`**. Public guide pages are pre-built, which is what makes draft slugs return a real 404. To release scheduled guides on time without merging anything, set up a daily Vercel Deploy Hook. Edits to guides that are already live are picked up within the hour.
4. **About page:** `about-soup.md` follows the same workflow and publishes `/about`.

Each article's slug must equal its file name (the tests in `tests/unit/guides-content.test.ts` enforce this, and also check that every `/guides/` link points at a guide that exists).

## Technical status (from the audit)

1. ✅ **Public access:** `/guides`, `/about`, `/robots.txt` and `/sitemap.xml` are now public paths in `src/middleware.ts`. The rest of the site, including the homepage, still requires sign-in, so it can't be indexed. Making the homepage public is a separate product decision.
2. ✅ **Article template, sitemap and robots:** these now exist, with per-page title, description, canonical URL, Open Graph, breadcrumbs and JSON-LD.
3. ⏳ **Set `NEXT_PUBLIC_SITE_URL`** in production. Canonical URLs and the sitemap use it, and fall back to `https://soupassist.com`.
4. ⏳ **Search Console and analytics:** verify the domain in Google Search Console and submit `https://soupassist.com/sitemap.xml`. No analytics or conversion-event tooling exists in the codebase yet.
5. ⏳ **Featured images:** each article has an image brief and alt text in its front matter, but no images have been produced yet.

## Deployment note

Vercel production deploys automatically from `master`, but only for commits whose **author** is the project owner's git identity (Balaj Amjad). Merge commits created by GitHub's "Merge pull request" button are authored by the `learnersdeneu-hub` account, and Vercel did not deploy them (PRs #17 and #18 stayed undeployed). Until that account's email is linked to the Vercel account, merge locally as the owner and push, or use **Create Deployment** in Vercel after merging.
