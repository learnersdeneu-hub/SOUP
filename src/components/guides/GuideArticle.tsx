import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { GuideMarkdown } from "@/components/guides/GuideMarkdown";
import { siteUrl, type Guide } from "@/lib/guides/content";

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function guideStructuredData(guide: Guide) {
  const base = siteUrl();
  const url = `${base}${guide.path}`;
  const crumbs = guide.kind === "about"
    ? [{ name: "SOUP", url: base }, { name: "About", url }]
    : [{ name: "SOUP", url: base }, { name: "Guides", url: `${base}/guides` }, { name: guide.h1, url }];
  const graph: Record<string, unknown>[] = [
    {
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((crumb, index) => ({ "@type": "ListItem", position: index + 1, name: crumb.name, item: crumb.url })),
    },
    guide.kind === "about"
      ? { "@type": "AboutPage", name: guide.h1, description: guide.metaDescription, url, mainEntity: { "@type": "Organization", name: "SOUP", url: base, logo: `${base}/brand/soup-mark.png` } }
      : {
          "@type": "Article",
          headline: guide.h1,
          description: guide.metaDescription,
          mainEntityOfPage: url,
          datePublished: guide.publicationDate || undefined,
          dateModified: guide.lastReviewed || guide.publicationDate || undefined,
          author: { "@type": "Organization", name: "SOUP", url: base },
          publisher: { "@type": "Organization", name: "SOUP", logo: { "@type": "ImageObject", url: `${base}/brand/soup-mark.png` } },
        },
  ];
  if (guide.faqs.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: guide.faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export function GuideArticle({ guide, banner }: { guide: Guide; banner?: React.ReactNode }) {
  const published = formatDate(guide.publicationDate);
  const reviewed = formatDate(guide.lastReviewed);
  return (
    <article className="mx-auto w-full max-w-3xl px-4 pb-16 pt-4 sm:px-8">
      {/* JSON-LD is built only from the repository's own Markdown, never from user input; "<" is escaped so no string can close the script tag early. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(guideStructuredData(guide)).replace(/</g, "\\u003c") }} />
      {banner}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-mute">
        <Link href="/" className="hover:text-ink">SOUP</Link>
        <ChevronRight size={12} aria-hidden />
        {guide.kind === "about" ? <span aria-current="page" className="text-ink">About</span> : (
          <>
            <Link href="/guides" className="hover:text-ink">Guides</Link>
            <ChevronRight size={12} aria-hidden />
            <span aria-current="page" className="line-clamp-1 text-ink">{guide.h1}</span>
          </>
        )}
      </nav>
      <h1 className="mt-5 text-[28px] font-semibold leading-tight text-ink sm:text-4xl">{guide.h1}</h1>
      {(published || reviewed) && (
        <p className="mt-3 text-xs text-mute">
          {published && <>Published <time dateTime={guide.publicationDate || undefined}>{published}</time></>}
          {published && reviewed && " · "}
          {reviewed && <>Last reviewed <time dateTime={guide.lastReviewed || undefined}>{reviewed}</time></>}
        </p>
      )}
      <div className="mt-2">
        <GuideMarkdown body={guide.body} />
      </div>
      <aside className="mt-12 rounded-2xl bg-navy p-6 text-white sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-white/70">Plan your next step with SOUP</p>
        <p className="mt-2 text-lg font-semibold leading-snug">Build one profile, get a realistic shortlist from Noodles, and keep every application in one place.</p>
        <Link href="/sign-up" className="mt-5 inline-flex rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white no-underline">Request access</Link>
      </aside>
    </article>
  );
}
