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
| 6 | `reuse-information-across-university-application-portals.md` | `/guides/reuse-information-across-university-application-portals` | F (Companion) | university application autofill | draft (overlaps #7; keep as a how-to or merge into #7 before publishing) | 2026-11-17 |
| 7 | `soup-companion-ai-application-assistant.md` | `/guides/soup-companion-ai-application-assistant` | F (Companion pillar, with graphics) | AI university application assistant | **published 2026-11-18** | 2026-11-18 |
| 8 | `what-to-do-after-o-levels.md` | `/guides/what-to-do-after-o-levels` | A (O-level, with graphic) | what to do after O levels | **published 2026-11-18** | 2026-11-18 |
| 9 | `a-level-subjects-for-medicine-engineering-business-law.md` | `/guides/a-level-subjects-for-medicine-engineering-business-law` | A | A level subjects for medicine | **published 2026-11-18** | 2026-11-18 |
| 10 | `applying-to-university-with-predicted-grades.md` | `/guides/applying-to-university-with-predicted-grades` | A | applying to university with predicted grades | **published 2026-11-18** | 2026-11-18 |
| 11 | `study-abroad-from-the-gcc-british-curriculum.md` | `/guides/study-abroad-from-the-gcc-british-curriculum` | A/B (GCC) | study abroad from UAE | **published 2026-11-18** | 2026-11-18 |
| 12 | `university-applications-guide-for-school-counsellors.md` | `/guides/university-applications-guide-for-school-counsellors` | F (counsellors) | university application guide for school counsellors | **published 2026-11-18** | 2026-11-18 |
| 13 | `top-10-fully-funded-scholarships-europe.md` | `/guides/top-10-fully-funded-scholarships-europe` | Ranking guides (scholarships) | fully funded scholarships in Europe | **published 2026-11-18** | 2026-11-18 |
| 14 | `top-10-government-scholarships-international-students.md` | `/guides/top-10-government-scholarships-international-students` | Ranking guides (scholarships) | government scholarships for international students | **published 2026-11-18** | 2026-11-18 |
| 15 | `top-10-universities-world-medicine.md` | `/guides/top-10-universities-world-medicine` | Ranking guides (subjects) | top universities in the world for medicine | **published 2026-11-18** | 2026-11-18 |
| 16 | `top-10-universities-world-law.md` | `/guides/top-10-universities-world-law` | Ranking guides (subjects) | top universities in the world for law | **published 2026-11-18** | 2026-11-18 |
| 17 | `top-10-universities-world-aerospace-engineering.md` | `/guides/top-10-universities-world-aerospace-engineering` | Ranking guides (subjects) | top universities for aerospace engineering | draft: places 5–9 unverified | 2026-11-18 |

## Rules every article follows

- Each file's front matter holds the SEO title, meta description, keywords, intent, audience, slug, dates, image brief and alt text.
- No invented fees, deadlines, rankings, scholarship amounts or partner relationships. Fast-changing facts link to the official source and carry a "last reviewed" date.
- `review_notes` in the front matter lists what an editor must confirm before publishing.
- Internal links point to existing SOUP routes (`/universities`, `/counselor`, `/premium`, `/services/insurance`, `/services/accommodation`, `/companion/connect`, `/sign-up`) and to other guides at `/guides/<slug>`.

## Ranking guides series

Ranking guides set `section: "rankings"` in their front matter. They appear under **Ranking guides** on `/guides` (anchor `#ranking-guides`), and their breadcrumb reads Guides › Ranking guides. Every ranking guide must:

1. **Name its source and edition** in the title or the first screen, for example "QS World University Rankings by Subject 2026". Never mix tables: QS "Medicine" is not QS "Life Sciences & Medicine".
2. **Separate tuition-free from low-cost.** Call an option **tuition-free** only if international (non-EU) students pay no tuition. A small semester contribution is fine, if you state it. Anything else is **low-cost**, with the fee and the year it applies to. For scholarships, **fully funded** means the award covers or waives tuition **and** pays a living allowance. Awards that do only one go under "Generous, but not fully funded".
3. **Check current international-student eligibility** (and Pakistan/GCC eligibility where relevant) before publishing, and record the date in `eligibility_verified`. The page shows it.
4. **Cross-link within the series.** Every country guide links to its relevant subject rankings, affordability guides and scholarship guides, and to SOUP's university and programme listings (`/universities`). Subject rankings link back to the country guides they mention. The guide tests block links to unpublished guides.
5. **Never publish a top 10 with unverified places.** Hold it as a draft with `[verify]` markers, as the aerospace guide is now.

**Listings gap:** SOUP's university and programme pages (`/universities`) require sign-in. Signed-out readers who follow a listing link land on the sign-in page. Public, non-thin programme pages would make these links far more useful for SEO.

**50-article plan:** the full 50-title list and its publishing priority (cheapest universities, then free education, Asian destinations, admissions and scholarships, global rankings, specialist subjects) still need to be added here. #13–#17 above are the first five.

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

Until 2026-11-18, production was deployed by hand with the Vercel CLI (`vercel --prod`), and the Vercel project wasn't connected to GitHub. That's why merging PRs #17 and #18 didn't deploy anything. The project is now connected to `learnersdeneu-hub/SOUP` with `master` as the production branch, so a merge to `master` deploys production. If a merge doesn't appear under Deployments, check whether it shows as "Blocked": Vercel's Hobby plan only deploys commits by authors on the account.
