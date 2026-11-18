import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseFrontMatter } from "@/lib/guides/frontMatter";
import { extractFaqs, isPublished, loadAllGuides, parseGuide, stripLeadingH1 } from "@/lib/guides/content";

// Covers the editorial gate (drafts must never render publicly), the
// front-matter subset parser, and the integrity of the real content in
// content/guides: every file parses, slugs match file names, and every
// internal /guides/ link points at a guide that exists.

const MINIMAL = (fields: string) => `---
title: "T"
meta_description: "D"
h1: "H"
category: "C"
primary_keyword: "k"
${fields}
---

# H

Body`;

describe("parseFrontMatter", () => {
  it("reads quoted scalars and lists, and returns the body", () => {
    const { data, body } = parseFrontMatter(`---\ntitle: "A \\"quoted\\" title"\nplain: value\nitems:\n  - "one"\n  - two\n---\n\n# Heading\n`);
    expect(data.title).toBe("A \"quoted\" title");
    expect(data.plain).toBe("value");
    expect(data.items).toEqual(["one", "two"]);
    expect(body).toBe("# Heading\n");
  });

  it("rejects files without front matter or with unsupported lines", () => {
    expect(() => parseFrontMatter("# No front matter")).toThrow();
    expect(() => parseFrontMatter("---\ntitle: x\n---")).not.toThrow();
    expect(() => parseFrontMatter("---\n{ not: yaml-subset }\n---")).toThrow();
  });
});

describe("publication gate", () => {
  const now = new Date("2026-12-01T12:00:00Z");

  it("keeps drafts unpublished", () => {
    const guide = parseGuide("x.md", MINIMAL(`slug: "/guides/x"\nstatus: "draft — awaiting editorial approval"\npublication_date: "2026-11-01"`));
    expect(isPublished(guide, now)).toBe(false);
  });

  it("requires an ISO publication date that has arrived", () => {
    const due = parseGuide("x.md", MINIMAL(`slug: "/guides/x"\nstatus: "published"\npublication_date: "2026-12-01"`));
    const scheduled = parseGuide("x.md", MINIMAL(`slug: "/guides/x"\nstatus: "published"\npublication_date: "2026-12-02"`));
    const undated = parseGuide("x.md", MINIMAL(`slug: "/guides/x"\nstatus: "published"\npublication_date: "TBC on approval"`));
    expect(isPublished(due, now)).toBe(true);
    expect(isPublished(scheduled, now)).toBe(false);
    expect(isPublished(undated, now)).toBe(false);
  });

  it("rejects slugs outside /guides/ and /about", () => {
    expect(() => parseGuide("x.md", MINIMAL(`slug: "/universities/x"\nstatus: "published"`))).toThrow();
    expect(parseGuide("a.md", MINIMAL(`slug: "/about"\nstatus: "published"`)).kind).toBe("about");
  });
});

describe("body helpers", () => {
  it("drops only the leading H1", () => {
    expect(stripLeadingH1("# Title\n\nText\n\n# Not leading")).toBe("Text\n\n# Not leading");
  });

  it("extracts FAQs as plain text from the FAQ section only", () => {
    const body = "## Intro\n\n### Not a FAQ\n\nNo.\n\n## Frequently asked questions\n\n### Can I?\n\nYes, see [the guide](/guides/x).\n\n### **Bold** question?\n\nAnswer two.\n\n## How SOUP can help\n\nCTA";
    expect(extractFaqs(body)).toEqual([
      { question: "Can I?", answer: "Yes, see the guide." },
      { question: "Bold question?", answer: "Answer two." },
    ]);
  });
});

describe("content/guides", () => {
  const guides = loadAllGuides();
  const guideSlugs = new Set(guides.filter((guide) => guide.kind === "guide").map((guide) => guide.slug));

  it("loads every Markdown file except the README", () => {
    const files = fs.readdirSync(path.join(process.cwd(), "content", "guides")).filter((file) => file.endsWith(".md") && file !== "README.md");
    expect(guides.map((guide) => guide.file)).toEqual(files.sort());
    expect(guides.filter((guide) => guide.kind === "about")).toHaveLength(1);
  });

  it("names each guide file after its slug", () => {
    for (const guide of guides.filter((item) => item.kind === "guide")) {
      expect(guide.file).toBe(`${guide.slug}.md`);
    }
  });

  it("links only to guides that exist", () => {
    for (const guide of guides) {
      for (const [, slug] of guide.body.matchAll(/\]\(\/guides\/([a-z0-9-]+)\)/g)) {
        expect(guideSlugs.has(slug), `${guide.file} links to missing guide ${slug}`).toBe(true);
      }
    }
  });

  it("never links a published page to an unpublished guide (which would 404)", () => {
    const published = new Set(guides.filter((guide) => guide.kind === "guide" && guide.status === "published").map((guide) => guide.slug));
    for (const guide of guides.filter((item) => item.status === "published")) {
      for (const [, slug] of guide.body.matchAll(/\]\(\/guides\/([a-z0-9-]+)\)/g)) {
        expect(published.has(slug), `${guide.file} is published but links to unpublished guide ${slug}`).toBe(true);
      }
    }
  });

  it("only marks a guide published with a real publication date", () => {
    for (const guide of guides.filter((item) => item.status === "published")) {
      expect(guide.publicationDate, `${guide.file} is published without an ISO publication_date`).not.toBeNull();
    }
  });
});
