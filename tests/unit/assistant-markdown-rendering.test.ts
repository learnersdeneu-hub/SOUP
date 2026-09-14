import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AssistantMarkdown } from "../../src/components/conversation/ConversationWorkspace";

function render(content: string) {
  return renderToStaticMarkup(createElement(AssistantMarkdown, { content, className: "test" }));
}

describe("AssistantMarkdown (shared renderer used by Noodles, Accommodation, Insurance, Finance, Scholarships)", () => {
  it("renders bold field labels instead of literal asterisks", () => {
    const html = render("**Cost:** $10,000 per year");
    expect(html).toContain("<strong");
    expect(html).toContain("Cost:");
    expect(html).not.toContain("**Cost:**");
  });

  it("renders italic emphasis instead of literal asterisks", () => {
    const html = render("*Independent Recommendation*");
    expect(html).toMatch(/<em[ >]/);
    expect(html).not.toContain("*Independent Recommendation*");
  });

  it("renders unordered lists as real list markup", () => {
    const html = render("- First requirement\n- Second requirement");
    expect(html).toContain("<ul");
    expect(html).toContain("<li");
    expect(html).toContain("First requirement");
  });

  it("renders safe http(s) links with target/rel protection", () => {
    const html = render("[official site](https://example.edu/apply)");
    expect(html).toContain('href="https://example.edu/apply"');
    expect(html).toContain('target="_blank"');
    expect(html).toMatch(/rel="noreferrer noopener"/);
  });

  it("drops unsafe link protocols instead of rendering them as clickable", () => {
    const html = render("[click me](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<a ");
  });

  it("never executes or renders raw HTML embedded in assistant/AI output (escaped to inert text, not a live tag)", () => {
    const html = render('<img src=x onerror="alert(1)">');
    expect(html).not.toMatch(/<img\b/);
    expect(html).toContain("&lt;img");
  });

  it("never renders a script tag embedded in assistant/AI output", () => {
    const html = render('<script>alert(1)</script>after text');
    expect(html).not.toMatch(/<script\b/);
  });
});
