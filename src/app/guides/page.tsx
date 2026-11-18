import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { GUIDE_TOPICS, getPublishedGuides, siteUrl, type Guide } from "@/lib/guides/content";
import { JOURNAL_ARTICLES } from "@/lib/landing/journal";
import { OrganizationJsonLd } from "@/lib/seo/organization";

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  const hasGuides = getPublishedGuides().length > 0;
  const title = "Guides for International Students | SOUP";
  const description = "Source-checked guides from SOUP: O-levels and A-levels, study destinations, applications, SOUP Companion, scholarship rankings and university subject rankings.";
  return {
    title,
    description,
    alternates: { canonical: `${siteUrl()}/guides` },
    openGraph: { type: "website", url: `${siteUrl()}/guides`, title, description, siteName: "SOUP" },
    // An empty index is thin content; keep it out of search until the first guide is live.
    robots: hasGuides ? undefined : { index: false, follow: true },
  };
}

function GuideCard({ guide, cta }: { guide: Guide; cta: string }) {
  return (
    <li>
      <Link href={guide.path} className="flex h-full flex-col rounded-2xl border border-hair bg-white p-5 no-underline hover:border-teal">
        <span className="text-base font-semibold leading-snug text-ink">{guide.h1}</span>
        <span className="mt-2 line-clamp-2 text-[13px] leading-6 text-mute">{guide.metaDescription}</span>
        <span className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-semibold text-teal">{cta} <ArrowRight size={12} aria-hidden /></span>
      </Link>
    </li>
  );
}

// ItemList of every published guide in page order, so search and AI answer
// engines read the hub as one structured collection, not a loose grid.
function hubStructuredData(guides: Guide[]) {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "SOUP guides for international students",
    url: `${base}/guides`,
    publisher: { "@id": `${base}/#organization` },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: guides.map((guide, index) => ({ "@type": "ListItem", position: index + 1, url: `${base}${guide.path}`, name: guide.h1 })),
    },
  };
}

export default function GuidesIndexPage() {
  const guides = getPublishedGuides();
  const groups = GUIDE_TOPICS
    .map((topic) => ({ ...topic, guides: guides.filter((guide) => guide.topic === topic.id).sort((a, b) => a.order - b.order) }))
    .filter((group) => group.guides.length > 0);
  const untopiced = guides.filter((guide) => !guide.topic);
  const firstRankingGroup = groups.find((group) => group.section === "rankings")?.id;
  const ordered = [...groups.flatMap((group) => group.guides), ...untopiced];

  return (
    <div className="min-h-screen bg-paper">
      <OrganizationJsonLd />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(hubStructuredData(ordered)).replace(/</g, "\\u003c") }} />
      <Header signedIn={false} />
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-4 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-teal">SOUP guides</p>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight text-ink sm:text-4xl">Guides for international students</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-mute">Source-checked guidance from SOUP on choosing subjects and universities, applying in the UK, US, Europe and the GCC, and paying for it. Fast-changing facts link to the official source and show when we last checked them.</p>

        {guides.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-hair bg-white p-6 text-sm text-mute">Our first guides are being reviewed and will appear here soon.</p>
        ) : (
          <nav aria-label="Guide topics" className="mt-6 flex flex-wrap gap-2">
            {groups.map((group) => (
              <a key={group.id} href={`#${group.id}`} className="rounded-full border border-hair bg-white px-3.5 py-1.5 text-xs font-semibold text-ink no-underline hover:border-teal">{group.title} <span className="text-mute">({group.guides.length})</span></a>
            ))}
            <a href="#quick-reads" className="rounded-full border border-hair bg-white px-3.5 py-1.5 text-xs font-semibold text-ink no-underline hover:border-teal">Quick reads <span className="text-mute">({JOURNAL_ARTICLES.length})</span></a>
          </nav>
        )}

        {groups.map((group) => (
          <section key={group.id} id={group.id} aria-labelledby={`${group.id}-heading`} className="mt-12 scroll-mt-6">
            {group.id === firstRankingGroup && (
              <div id="ranking-guides" className="mb-6 scroll-mt-6 border-t border-hair pt-8">
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-teal">Ranking guides</p>
                <p className="mt-1 max-w-2xl text-[13px] leading-6 text-mute">Top-10 lists built from named, dated sources, with what each option really costs and who is eligible to apply.</p>
              </div>
            )}
            <h2 id={`${group.id}-heading`} className="text-lg font-semibold text-ink sm:text-xl">{group.title}</h2>
            <p className="mt-1 text-[13px] leading-6 text-mute">{group.blurb}</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.guides.map((guide) => <GuideCard key={guide.slug} guide={guide} cta={group.section === "rankings" ? "See the ranking" : "Read the guide"} />)}
            </ul>
          </section>
        ))}

        {untopiced.length > 0 && (
          <section aria-labelledby="more-heading" className="mt-12">
            <h2 id="more-heading" className="text-lg font-semibold text-ink sm:text-xl">More guides</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {untopiced.map((guide) => <GuideCard key={guide.slug} guide={guide} cta="Read the guide" />)}
            </ul>
          </section>
        )}

        <section id="quick-reads" aria-labelledby="quick-reads-heading" className="mt-12 scroll-mt-6 border-t border-hair pt-8">
          <h2 id="quick-reads-heading" className="text-lg font-semibold text-ink sm:text-xl">Quick reads from the SOUP Journal</h2>
          <p className="mt-1 text-[13px] leading-6 text-mute">Short, practical articles on timelines, money, insurance and housing.</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {JOURNAL_ARTICLES.map((article) => (
              <li key={article.slug}>
                <Link href={`/journal/${article.slug}`} className="flex h-full flex-col rounded-2xl border border-hair bg-white p-5 no-underline hover:border-teal">
                  <span className="text-[11px] font-semibold uppercase tracking-[.12em] text-mute">{article.category} · {article.readMinutes} min</span>
                  <span className="mt-1.5 text-base font-semibold leading-snug text-ink">{article.title}</span>
                  <span className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-semibold text-teal">Read <ArrowRight size={12} aria-hidden /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-12 text-sm text-mute">SOUP is the Students Online University Portal, founded by Balaj Amjad and co-founder Rameen Ahmad. <Link href="/about" className="font-semibold text-teal">About SOUP and our team →</Link></p>
      </main>
    </div>
  );
}
