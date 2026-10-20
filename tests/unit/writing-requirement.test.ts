import { describe, expect, it } from "vitest";
import { computeWritingRequirement, countWords } from "../../src/lib/applications/writingRequirement";
import { isEuropeanCountry, isUnitedStates } from "../../src/lib/applications/europeCountries";

// Covers the Motivation Letter / Personal Statement required/optional rule
// (plan: "Which box is required depends on selected universities") — exact
// country matching only, never a substring match, so a country like
// "Caribbean Netherlands (Saba)" is never mistaken for "Netherlands".

describe("isEuropeanCountry / isUnitedStates", () => {
  it("matches known European countries case-insensitively", () => {
    expect(isEuropeanCountry("United Kingdom")).toBe(true);
    expect(isEuropeanCountry("germany")).toBe(true);
    expect(isEuropeanCountry("  Ireland  ")).toBe(true);
  });

  it("never matches by substring", () => {
    expect(isEuropeanCountry("Caribbean Netherlands (Saba)")).toBe(false);
    expect(isEuropeanCountry("New Zealand")).toBe(false);
  });

  it("matches United States aliases", () => {
    expect(isUnitedStates("United States")).toBe(true);
    expect(isUnitedStates("USA")).toBe(true);
    expect(isUnitedStates("us")).toBe(true);
  });

  it("returns false for null/undefined/empty country", () => {
    expect(isEuropeanCountry(null)).toBe(false);
    expect(isEuropeanCountry(undefined)).toBe(false);
    expect(isUnitedStates("")).toBe(false);
  });
});

describe("computeWritingRequirement", () => {
  it("requires neither box when no universities are selected", () => {
    expect(computeWritingRequirement([])).toEqual({ motivationLetterRequired: false, personalStatementRequired: false });
  });

  it("requires the Motivation Letter when any selected university is in Europe", () => {
    const result = computeWritingRequirement([{ university: { country: "Germany" } }, { university: { country: "United States" } }]);
    expect(result.motivationLetterRequired).toBe(true);
    expect(result.personalStatementRequired).toBe(true);
  });

  it("requires only the Personal Statement when every selected university is in the US", () => {
    const result = computeWritingRequirement([{ university: { country: "United States" } }]);
    expect(result).toEqual({ motivationLetterRequired: false, personalStatementRequired: true });
  });

  it("requires neither box when selected universities are outside Europe and the US", () => {
    const result = computeWritingRequirement([{ university: { country: "Australia" } }, { university: { country: null } }]);
    expect(result).toEqual({ motivationLetterRequired: false, personalStatementRequired: false });
  });
});

describe("countWords", () => {
  it("counts whitespace-separated words", () => {
    expect(countWords("This is five words total")).toBe(5);
  });

  it("returns 0 for empty or whitespace-only text", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   \n\t  ")).toBe(0);
  });

  it("collapses multiple spaces/newlines between words", () => {
    expect(countWords("one\n\n   two    three")).toBe(3);
  });
});
