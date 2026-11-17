import type { MetadataRoute } from "next";
import { findAbout, getPublishedGuides, isPublished, siteUrl } from "@/lib/guides/content";

// Only the public editorial surface is listed: every other route requires
// sign-in (see src/middleware.ts), so it can't be crawled anyway.
export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const guides = getPublishedGuides();
  const about = findAbout();
  const entries: MetadataRoute.Sitemap = [];
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
