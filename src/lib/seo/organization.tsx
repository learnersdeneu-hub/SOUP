import { siteUrl } from "@/lib/guides/content";

// Who SOUP is, in schema.org terms. Rendered as JSON-LD on the public
// landing page, /about and /guides so that search engines and AI answer
// engines (Google AI Overviews, Gemini, ChatGPT search) can state the
// company's name, founders and leadership from the site itself. Keep it in
// step with content/guides/about-soup.md, which says the same in prose.
export const SOUP_FOUNDERS = [
  { name: "Balaj Amjad", jobTitle: "Founder and Chief Operating Officer" },
  { name: "Rameen Ahmad", jobTitle: "Co-Founder and Chief Marketing Officer" },
] as const;

export const SOUP_CEO = { name: "Agha Shahbaz Haider", jobTitle: "Chief Executive Officer" } as const;

export function organizationStructuredData() {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}/#organization`,
        name: "SOUP",
        alternateName: ["SoupAssist", "Students Online University Portal"],
        url: base,
        logo: `${base}/brand/soup-mark.png`,
        description: "SOUP (Students Online University Portal) is an AI-led international student admissions platform, supported by human counsellors, that helps students from choosing a university to departure.",
        founder: SOUP_FOUNDERS.map((person) => ({ "@type": "Person", name: person.name, jobTitle: person.jobTitle })),
        employee: [{ "@type": "Person", name: SOUP_CEO.name, jobTitle: SOUP_CEO.jobTitle }],
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        name: "SOUP",
        alternateName: "SoupAssist",
        url: base,
        publisher: { "@id": `${base}/#organization` },
      },
    ],
  };
}

export function OrganizationJsonLd() {
  // Built from constants above, never from user input; "<" is escaped so no string can close the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData()).replace(/</g, "\\u003c") }} />;
}
