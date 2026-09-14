import { describe, expect, it } from "vitest";
import { conversationSystemPrompt, currentDateContext } from "../../src/lib/conversation/prompts";
import { shouldEnableCounselorWebResearch } from "../../src/lib/ai/researchPolicy";

const NOW = new Date("2026-09-13T00:00:00Z");

describe("current-date grounding in the Noodles system prompt", () => {
  it("injects the real request-time date so the model is not left to guess", () => {
    const prompt = conversationSystemPrompt("COUNSELOR", "", undefined, NOW);
    expect(prompt).toContain("CURRENT DATE");
    expect(prompt).toContain("2026");
    expect(prompt).toContain("September");
  });

  it("instructs the model never to present a past cycle as upcoming", () => {
    const prompt = conversationSystemPrompt("COUNSELOR", "", undefined, NOW);
    expect(prompt).toMatch(/never present an intake, deadline or cycle that has already passed as still upcoming/i);
  });

  it("reflects a different request-time date on a later call rather than a value baked in once", () => {
    const later = conversationSystemPrompt("COUNSELOR", "", undefined, new Date("2027-01-05T00:00:00Z"));
    expect(later).toContain("2027");
    expect(later).not.toContain("2026");
  });

  it("preserves the existing 60-day source-freshness rule and application operating rules untouched", () => {
    const prompt = conversationSystemPrompt("COUNSELOR", "", undefined, NOW);
    expect(prompt).toContain("older than roughly 60 days");
    expect(prompt).toContain("UNIVERSITY + PROGRAM + INTAKE");
  });
});

describe("application-intent mode (catalogue -> Noodles handoff)", () => {
  const entryUniversityContext = JSON.stringify({ name: "ESDES Business School", country: "France", partnershipChannel: "SOUP direct partner", verifiedPrograms: [{ title: "MSc Management", intake: "September 2027" }] });

  it("only activates the narrower application-intent instructions when a verified entry university is supplied", () => {
    const withoutEntry = conversationSystemPrompt("COUNSELOR", "", undefined, NOW);
    const withEntry = conversationSystemPrompt("COUNSELOR", "", undefined, NOW, entryUniversityContext);
    expect(withoutEntry).not.toContain("APPLICATION INTENT MODE");
    expect(withEntry).toContain("APPLICATION INTENT MODE");
    expect(withEntry).toContain("ESDES Business School");
  });

  it("instructs the model to skip broad discovery and never invent facts beyond the verified data", () => {
    const prompt = conversationSystemPrompt("COUNSELOR", "", undefined, NOW, entryUniversityContext);
    expect(prompt).toMatch(/skip the broad multi-university discovery funnel/i);
    expect(prompt).toMatch(/never invent a ranking, tuition figure, or intake that is not present/i);
  });

  it("still preserves the existing partner-priority and eligibility rules unchanged", () => {
    const prompt = conversationSystemPrompt("COUNSELOR", "", undefined, NOW, entryUniversityContext);
    expect(prompt).toContain("an unsuitable partner must never be pushed");
    expect(prompt).toContain("UNIVERSITY + PROGRAM + INTAKE");
  });
});

describe("currentDateContext", () => {
  it("formats an unambiguous, explicit date statement", () => {
    expect(currentDateContext(NOW)).toContain("Sunday, 13 September 2026");
  });
});

describe("web research date cues stay evergreen instead of hardcoded", () => {
  it("treats a mention of the current or next year as a live-fact cue, with no other cue words present", () => {
    expect(shouldEnableCounselorWebResearch([{ role: "user", content: "Tell me about 2026 next steps." }], "", NOW)).toBe(true);
    expect(shouldEnableCounselorWebResearch([{ role: "user", content: "What changes in 2027?" }], "", NOW)).toBe(true);
  });

  it("does not treat an unrelated distant year as a live-fact cue by itself", () => {
    expect(shouldEnableCounselorWebResearch([{ role: "user", content: "I graduated high school in 2019." }], "", NOW)).toBe(false);
  });
});
