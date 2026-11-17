import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { GuideArticle } from "@/components/guides/GuideArticle";
import { findAbout, isPublished, siteUrl } from "@/lib/guides/content";

// The About page is written and approved through the same editorial
// workflow as the guides (content/guides/about-soup.md). Until an editor
// publishes it, it renders the not-found screen with noindex. The root
// loading.tsx means that response still carries HTTP 200, but the page is
// left out of the sitemap and can't be indexed.
export const revalidate = 3600;

function publishedAbout() {
  const about = findAbout();
  return about && isPublished(about) ? about : null;
}

export function generateMetadata(): Metadata {
  const about = publishedAbout();
  if (!about) return { robots: { index: false, follow: false } };
  const url = `${siteUrl()}${about.path}`;
  return {
    title: about.title,
    description: about.metaDescription,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title: about.title, description: about.metaDescription, siteName: "SOUP" },
  };
}

export default function AboutPage() {
  const about = publishedAbout();
  if (!about) notFound();
  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn={false} />
      <main><GuideArticle guide={about} /></main>
    </div>
  );
}
