import { describe, expect, it } from "vitest";
import { computeApplicationProgress } from "../../src/lib/applications/progress";

describe("computeApplicationProgress", () => {
  it("reports 0/5 and 0% when nothing is filled in", () => {
    const result = computeApplicationProgress({});
    expect(result.completedCount).toBe(0);
    expect(result.totalCount).toBe(5);
    expect(result.percent).toBe(0);
    expect(result.sections.every((section) => !section.complete)).toBe(true);
  });

  it("reports 5/5 and 100% when every backing field is present", () => {
    const result = computeApplicationProgress({
      fullName: "Ada Lovelace",
      nationality: "British",
      dateOfBirth: new Date("2005-01-01"),
      currentCountry: "United Kingdom",
      passportUploaded: true,
      academicBackgroundSummary: "A-Levels: Maths, Physics, Computer Science",
      requiredEducationUploadsComplete: true,
      extracurricularComplete: true,
      englishProficiencySummary: "IELTS 7.5",
      fundingSummary: "Self-funded with family support",
      bankStatementUploaded: true,
    });
    expect(result.completedCount).toBe(5);
    expect(result.percent).toBe(100);
    expect(result.sections.every((section) => section.complete)).toBe(true);
  });

  it("requires every profile sub-field, including the passport upload, for the Profile & Details section", () => {
    const withoutPassport = computeApplicationProgress({
      fullName: "Ada Lovelace", nationality: "British", dateOfBirth: new Date("2005-01-01"), currentCountry: "United Kingdom", passportUploaded: false,
    });
    expect(withoutPassport.sections.find((section) => section.key === "profile")?.complete).toBe(false);

    const missingField = computeApplicationProgress({ fullName: "Ada Lovelace", nationality: "British", passportUploaded: true });
    expect(missingField.sections.find((section) => section.key === "profile")?.complete).toBe(false);
  });

  it("requires both the summary and the upload for Education Background", () => {
    const summaryOnly = computeApplicationProgress({ academicBackgroundSummary: "A-Levels", requiredEducationUploadsComplete: false });
    expect(summaryOnly.sections.find((section) => section.key === "academic")?.complete).toBe(false);

    const uploadOnly = computeApplicationProgress({ academicBackgroundSummary: "", requiredEducationUploadsComplete: true });
    expect(uploadOnly.sections.find((section) => section.key === "academic")?.complete).toBe(false);
  });

  it("requires both the summary and the bank statement upload for Funding", () => {
    const summaryOnly = computeApplicationProgress({ fundingSummary: "Family-funded", bankStatementUploaded: false });
    expect(summaryOnly.sections.find((section) => section.key === "funding")?.complete).toBe(false);

    const uploadOnly = computeApplicationProgress({ fundingSummary: "", bankStatementUploaded: true });
    expect(uploadOnly.sections.find((section) => section.key === "funding")?.complete).toBe(false);
  });

  it("treats a whitespace-only summary as not filled in", () => {
    const result = computeApplicationProgress({ academicBackgroundSummary: "   " });
    const academicSection = result.sections.find((section) => section.key === "academic");
    expect(academicSection?.complete).toBe(false);
  });

  it("drives the Extracurricular & Recommendations section from a single precomputed boolean", () => {
    const incomplete = computeApplicationProgress({ extracurricularComplete: false });
    expect(incomplete.sections.find((section) => section.key === "extracurricular")?.complete).toBe(false);

    const complete = computeApplicationProgress({ extracurricularComplete: true });
    expect(complete.sections.find((section) => section.key === "extracurricular")?.complete).toBe(true);
  });

  it("gives every section a distinct, real navigation target, in the new order", () => {
    const result = computeApplicationProgress({});
    const hrefs = result.sections.map((section) => section.href);
    expect(hrefs).toEqual(["/profile/details", "/profile/education", "/profile/extracurricular", "/profile/testing", "/profile/funding"]);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("no longer includes Standard Documents or Selected Universities", () => {
    const result = computeApplicationProgress({});
    const keys = result.sections.map((section) => section.key);
    expect(keys).not.toContain("documents");
    expect(keys).not.toContain("applications");
  });

  it("computes a partial fraction correctly", () => {
    const result = computeApplicationProgress({
      fullName: "Ada Lovelace",
      nationality: "British",
      dateOfBirth: new Date("2005-01-01"),
      currentCountry: "United Kingdom",
      passportUploaded: true,
    });
    expect(result.completedCount).toBe(1);
    expect(result.percent).toBe(20);
  });
});
