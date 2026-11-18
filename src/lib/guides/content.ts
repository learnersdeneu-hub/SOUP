import fs from "node:fs";
import path from "node:path";
import { parseFrontMatter, type FrontMatter } from "@/lib/guides/frontMatter";

// Editorial content lives as Markdown in content/guides (see its README.md
// for the workflow). A guide goes live only when an editor sets
// `status: "published"` AND its `publication_date` (YYYY-MM-DD) has arrived;
// everything else stays reachable only through the staff preview at
// /admin/guides. This is the "editorial approval before publication" gate,
// and the date check is what lets approved guides be scheduled rather than
// all released at once.

export const GUIDES_DIR = path.join(process.cwd(), "content", "guides");
export const ABOUT_PATH = "/about";
const GUIDE_PREFIX = "/guides/";

export type Faq = { question: string; answer: string };

// Guides are grouped into sections on /guides. "rankings" is the SOUP
// Ranking guides series (top-10 lists, affordability and scholarship
// rankings); everything else is a regular guide.
export const GUIDE_SECTIONS = ["guides", "rankings"] as const;
export type GuideSection = (typeof GUIDE_SECTIONS)[number];

// Topics organise /guides into clear groups. Each topic belongs to one
// section, and the order here is the order on the page.
export const GUIDE_TOPICS = [
  { id: "o-a-levels", section: "guides", title: "O-levels and A-levels", blurb: "Choosing subjects, routes and predicted grades with university in mind." },
  { id: "destinations", section: "guides", title: "Study destinations", blurb: "Country and pathway guides for Greece, Europe, the GCC and beyond." },
  { id: "applications", section: "guides", title: "Applications and SOUP Companion", blurb: "Documents, counsellors and the AI assistant that fills and reviews applications." },
  { id: "scholarships", section: "rankings", title: "Scholarship rankings", blurb: "Fully funded and government scholarships, with who can apply and what they really pay." },
  { id: "subjects", section: "rankings", title: "Subject rankings", blurb: "The world's top universities by subject, from a named, dated ranking edition." },
] as const;
export type GuideTopic = (typeof GUIDE_TOPICS)[number]["id"];

export type Guide = {
  file: string;
  path: string;
  slug: string;
  kind: "guide" | "about";
  title: string;
  metaDescription: string;
  h1: string;
  category: string;
  section: GuideSection;
  topic: GuideTopic | null;
  // Reading order within a topic on /guides (lower first).
  order: number;
  primaryKeyword: string;
  supportingKeywords: string[];
  status: string;
  publicationDate: string | null;
  lastReviewed: string | null;
  featuredImageAlt: string;
  eligibilityVerified: string | null;
  reviewNotes: string[];
  body: string;
  faqs: Faq[];
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function scalar(data: FrontMatter, key: string, required = true) {
  const value = data[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  if (required) throw new Error(`Guide front matter is missing "${key}".`);
  return "";
}

function list(data: FrontMatter, key: string) {
  const value = data[key];
  return Array.isArray(value) ? value : [];
}

function isoOrNull(value: string) {
  return ISO_DATE.test(value) ? value : null;
}

// The article's own H1 is rendered by the page template (above the
// breadcrumb-adjacent metadata), so the Markdown's leading "# ..." line is
// dropped to avoid two H1s on one page.
export function stripLeadingH1(body: string) {
  return body.replace(/^#\s+[^\n]*\n+/, "");
}

function plainText(markdown: string) {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// FAQs are read from the "## Frequently asked questions" section, where each
// "### Question" is followed by its answer, so the visible FAQ and the
// FAQPage structured data can never drift apart.
export function extractFaqs(body: string): Faq[] {
  const section = body.match(/^##\s+Frequently asked questions\s*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/im);
  if (!section) return [];
  return section[1]
    .split(/^###\s+/m)
    .slice(1)
    .map((chunk) => {
      const [question, ...rest] = chunk.split("\n");
      return { question: plainText(question), answer: plainText(rest.join("\n")) };
    })
    .filter((faq) => faq.question && faq.answer);
}

export function parseGuide(file: string, source: string): Guide {
  const { data, body } = parseFrontMatter(source);
  const guidePath = scalar(data, "slug");
  const kind = guidePath === ABOUT_PATH ? "about" : "guide";
  if (kind === "guide" && !guidePath.startsWith(GUIDE_PREFIX)) {
    throw new Error(`${file}: slug must be ${ABOUT_PATH} or start with ${GUIDE_PREFIX}.`);
  }
  const section = scalar(data, "section", false) || "guides";
  if (!(GUIDE_SECTIONS as readonly string[]).includes(section)) {
    throw new Error(`${file}: section must be one of ${GUIDE_SECTIONS.join(", ")}.`);
  }
  const topicId = scalar(data, "topic", false);
  const topic = topicId ? GUIDE_TOPICS.find((item) => item.id === topicId) : null;
  if (topicId && !topic) throw new Error(`${file}: unknown topic "${topicId}".`);
  if (topic && topic.section !== section) throw new Error(`${file}: topic "${topicId}" belongs to the ${topic.section} section.`);
  return {
    file,
    path: guidePath,
    slug: kind === "about" ? "about" : guidePath.slice(GUIDE_PREFIX.length),
    kind,
    title: scalar(data, "title"),
    metaDescription: scalar(data, "meta_description"),
    h1: scalar(data, "h1"),
    category: scalar(data, "category"),
    section: section as GuideSection,
    topic: topic ? topic.id : null,
    order: Number(scalar(data, "order", false)) || 100,
    primaryKeyword: scalar(data, "primary_keyword"),
    supportingKeywords: list(data, "supporting_keywords"),
    status: scalar(data, "status"),
    publicationDate: isoOrNull(scalar(data, "publication_date", false)),
    lastReviewed: isoOrNull(scalar(data, "last_reviewed", false)),
    featuredImageAlt: scalar(data, "featured_image_alt", false),
    eligibilityVerified: isoOrNull(scalar(data, "eligibility_verified", false)),
    reviewNotes: list(data, "review_notes"),
    body: stripLeadingH1(body),
    faqs: extractFaqs(body),
  };
}

export function isPublished(guide: Guide, now = new Date()) {
  if (guide.status !== "published" || !guide.publicationDate) return false;
  return guide.publicationDate <= now.toISOString().slice(0, 10);
}

export function loadAllGuides(dir = GUIDES_DIR): Guide[] {
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md") && file !== "README.md")
    .sort()
    .map((file) => parseGuide(file, fs.readFileSync(path.join(dir, file), "utf8")));
}

export function getPublishedGuides(now = new Date()) {
  return loadAllGuides()
    .filter((guide) => guide.kind === "guide" && isPublished(guide, now))
    .sort((a, b) => (b.publicationDate || "").localeCompare(a.publicationDate || ""));
}

export function findGuide(slug: string) {
  return loadAllGuides().find((guide) => guide.kind === "guide" && guide.slug === slug) || null;
}

export function findAbout() {
  return loadAllGuides().find((guide) => guide.kind === "about") || null;
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.soupassist.com").replace(/\/$/, "");
}
