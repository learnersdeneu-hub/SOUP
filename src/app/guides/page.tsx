import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { getPublishedGuides, siteUrl, type Guide } from "@/lib/guides/content";

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  const hasGuides = getPublishedGuides().length > 0;
  const title = "Guides for International Students | SOUP";
  const description = "Practical, source-checked guides to choosing universities, applying in the UK, US and Europe, scholarships, visas and preparing to study abroad.";
  return {
    title,
    description,
    alternates: { canonical: `${siteUrl()}/guides` },
    openGraph: { type: "website", url: `${siteUrl()}/guides`, title, description, siteName: "SOUP" },
    // An empty index is thin content; keep it out of search until the first guide is live.
    robots: hasGuides ? undefined : { index: false, follow: true },
  };
}

function GuideList({ guides, cta }: { guides: Guide[]; cta: string }) {
  return (
    <ul className="mt-5 grid gap-3 sm:grid-cols-2">
      {guides.map((guide) => (
        <li key={guide.slug}>
          <Link href={guide.path} className="flex h-full flex-col rounded-2xl border border-hair bg-white p-5 no-underline hover:border-teal">
            <span className="text-base font-semibold leading-snug text-ink">{guide.h1}</span>
            <span className="mt-2 line-clamp-3 text-[13px] leading-6 text-mute">{guide.metaDescription}</span>
            <span className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-semibold text-teal">{cta} <ArrowRight size={12} aria-hidden /></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function GuidesIndexPage() {
  const guides = getPublishedGuides();
  const regular = guides.filter((guide) => guide.section === "guides");
  const rankings = guides.filter((guide) => guide.section === "rankings");
  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn={false} />
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-4 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-teal">SOUP guides</p>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight text-ink sm:text-4xl">Guides for international students</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-mute">Practical, source-checked guidance on choosing universities, applying in the UK, US and Europe, funding, visas and getting ready to leave. Fast-changing facts link to the official source.</p>
        {guides.length === 0 && (
          <p className="mt-8 rounded-2xl border border-hair bg-white p-6 text-sm text-mute">Our first guides are being reviewed and will appear here soon.</p>
        )}
        {regular.length > 0 && (
          <section aria-labelledby="guides-heading" className="mt-10">
            <h2 id="guides-heading" className="text-lg font-semibold text-ink">Guides</h2>
            <GuideList guides={regular} cta="Read the guide" />
          </section>
        )}
        {rankings.length > 0 && (
          <section id="ranking-guides" aria-labelledby="ranking-guides-heading" className="mt-12 scroll-mt-6">
            <h2 id="ranking-guides-heading" className="text-lg font-semibold text-ink">Ranking guides</h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-6 text-mute">Top-10 lists built from named, dated sources, with the edition we used, what each option really costs, and who is eligible to apply.</p>
            <GuideList guides={rankings} cta="See the ranking" />
          </section>
        )}
      </main>
    </div>
  );
}
