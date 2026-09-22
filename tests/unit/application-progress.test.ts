import { describe, expect, it } from "vitest";
import { computeApplicationProgress } from "../../src/lib/applications/progress";

describe("computeApplicationProgress", () => {
  it("reports 0/6 and 0% when nothing is filled in", () => {
    const result = computeApplicationProgress({});
    expect(result.completedCount).toBe(0);
    expect(result.totalCount).toBe(6);
    expect(result.percent).toBe(0);
    expect(result.sections.every((section) => !section.complete)).toBe(true);
  });

  it("reports 6/6 and 100% when every backing field is present", () => {
    const result = computeApplicationProgress({
      fullName: "Ada Lovelace",
      nationality: "British",
      dateOfBirth: new Date("2005-01-01"),
      currentCountry: "United Kingdom",
      fundingSummary: "Self-funded with family support",
      academicBackgroundSummary: "A-Levels: Maths, Physics, Computer Science",
      englishProficiencySummary: "IELTS 7.5",
      documentCount: 3,
      applicationCount: 2,
    });
    expect(result.completedCount).toBe(6);
    expect(result.percent).toBe(100);
    expect(result.sections.every((section) => section.complete)).toBe(true);
  });

  it("requires every profile sub-field, not just one, for the Profile & Details section", () => {
    const result = computeApplicationProgress({ fullName: "Ada Lovelace", nationality: "British" });
    const profileSection = result.sections.find((section) => section.key === "profile");
    expect(profileSection?.complete).toBe(false);
  });

  it("treats a whitespace-only summary as not filled in", () => {
    const result = computeApplicationProgress({ academicBackgroundSummary: "   " });
    const academicSection = result.sections.find((section) => section.key === "academic");
    expect(academicSection?.complete).toBe(false);
  });

  it("computes a partial fraction correctly", () => {
    const result = computeApplicationProgress({
      fullName: "Ada Lovelace",
      nationality: "British",
      dateOfBirth: new Date("2005-01-01"),
      currentCountry: "United Kingdom",
      documentCount: 1,
    });
    expect(result.completedCount).toBe(2);
    expect(result.percent).toBe(33);
  });
});
