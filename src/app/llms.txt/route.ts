import { GUIDE_TOPICS, findAbout, getPublishedGuides, isPublished, siteUrl } from "@/lib/guides/content";
import { JOURNAL_ARTICLES } from "@/lib/landing/journal";
import { SOUP_CEO, SOUP_FOUNDERS } from "@/lib/seo/organization";

// /llms.txt (llmstxt.org): a plain-Markdown summary of who SOUP is and
// where its public content lives, for AI crawlers and answer engines.
// Generated from the same published guides as the sitemap, so drafts never
// appear here.
export const revalidate = 3600;

export function GET() {
  const base = siteUrl();
  const guides = getPublishedGuides();
  const about = findAbout();
  const lines: string[] = [
    "# SOUP (SoupAssist)",
    "",
    "> SOUP, the Students Online University Portal (soupassist.com), is an AI-led international student admissions platform supported by human counsellors. It helps students choose universities, prepare applications, and plan visas, insurance and accommodation. Its AI counsellor is called Noodles, and SOUP Companion is its desktop assistant that fills, checks and reviews university application forms from one profile.",
    "",
    `Founded by ${SOUP_FOUNDERS.map((person) => `${person.name} (${person.jobTitle})`).join(" and ")}. ${SOUP_CEO.name} is ${SOUP_CEO.jobTitle}.`,
    "",
    "## Company",
    "",
  ];
  if (about && isPublished(about)) lines.push(`- [About SOUP](${base}${about.path}): what SOUP does, its history since Learners Den in 2020, plans and team`);
  lines.push(`- [Guides hub](${base}/guides): every published SOUP guide, grouped by topic`);

  for (const topic of GUIDE_TOPICS) {
    const inTopic = guides.filter((guide) => guide.topic === topic.id).sort((a, b) => a.order - b.order);
    if (!inTopic.length) continue;
    lines.push("", `## ${topic.title}`, "");
    for (const guide of inTopic) lines.push(`- [${guide.h1}](${base}${guide.path}): ${guide.metaDescription}`);
  }

  lines.push("", "## Optional", "");
  for (const article of JOURNAL_ARTICLES) lines.push(`- [${article.title}](${base}/journal/${article.slug}): ${article.dek}`);

  return new Response(`${lines.join("\n")}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
