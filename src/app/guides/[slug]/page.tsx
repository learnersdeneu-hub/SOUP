import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { GuideArticle } from "@/components/guides/GuideArticle";
import { findGuide, getPublishedGuides, isPublished, siteUrl, type Guide } from "@/lib/guides/content";

// Statically rendered for speed and crawlability. Only guides that are
// published at build time exist as routes: dynamicParams = false makes every
// other slug (drafts, typos) a real router-level 404. A notFound() thrown
// during render can't do that here, because the root loading.tsx starts
// streaming a 200 first. As a result, a guide scheduled for a future
// publication_date goes live at the first deploy on or after that date
// (see content/guides/README.md). Hourly revalidation picks up edits to
// guides that are already live.
export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return getPublishedGuides().map((guide) => ({ slug: guide.slug }));
}

function publishedGuide(slug: string): Guide | null {
  const guide = findGuide(slug);
  return guide && isPublished(guide) ? guide : null;
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const guide = publishedGuide(params.slug);
  if (!guide) return { robots: { index: false, follow: false } };
  const url = `${siteUrl()}${guide.path}`;
  return {
    title: guide.title,
    description: guide.metaDescription,
    keywords: [guide.primaryKeyword, ...guide.supportingKeywords],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: guide.title,
      description: guide.metaDescription,
      siteName: "SOUP",
      publishedTime: guide.publicationDate || undefined,
      modifiedTime: guide.lastReviewed || undefined,
    },
    twitter: { card: "summary", title: guide.title, description: guide.metaDescription },
  };
}

export default function GuidePage({ params }: { params: { slug: string } }) {
  const guide = publishedGuide(params.slug);
  if (!guide) notFound();
  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn={false} />
      <main><GuideArticle guide={guide} /></main>
    </div>
  );
}
