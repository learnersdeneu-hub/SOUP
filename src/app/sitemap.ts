import type { MetadataRoute } from "next";
import { findAbout, getPublishedGuides, isPublished, siteUrl } from "@/lib/guides/content";
import { JOURNAL_ARTICLES } from "@/lib/landing/journal";

// Only the public surface is listed: the landing page (served at / to
// signed-out visitors), the Journal, and published guides and About. Every
// other route requires sign-in (see src/middleware.ts), so it can't be
// crawled anyway.
export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const guides = getPublishedGuides();
  const about = findAbout();
  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/journal`, changeFrequency: "weekly", priority: 0.7 },
    ...JOURNAL_ARTICLES.map((article) => ({ url: `${base}/journal/${article.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
  if (about && isPublished(about)) {
    entries.push({ url: `${base}${about.path}`, lastModified: about.lastReviewed || about.publicationDate || undefined, changeFrequency: "monthly", priority: 0.6 });
  }
  if (guides.length) {
    entries.push({ url: `${base}/guides`, lastModified: guides[0].publicationDate || undefined, changeFrequency: "weekly", priority: 0.8 });
  }
  for (const guide of guides) {
    entries.push({ url: `${base}${guide.path}`, lastModified: guide.lastReviewed || guide.publicationDate || undefined, changeFrequency: "monthly", priority: 0.7 });
  }
  return entries;
}
