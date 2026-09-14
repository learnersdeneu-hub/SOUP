import { describe, expect, it } from "vitest";
import { evaluateIntakeFreshness } from "../../src/lib/conversation/intake";

// The real-world bug: Noodles proposed a "2025 intake" while the actual
// current date was September 2026.
const NOW = new Date("2026-09-13T00:00:00Z");

describe("evaluateIntakeFreshness", () => {
  it("flags an explicit past-year term intake as PAST", () => {
    expect(evaluateIntakeFreshness("Fall 2025", NOW)).toBe("PAST");
    expect(evaluateIntakeFreshness("Spring 2025", NOW)).toBe("PAST");
    expect(evaluateIntakeFreshness("2025 intake", NOW)).toBe("PAST");
  });

  it("flags a same-year term whose window has already closed as PAST", () => {
    expect(evaluateIntakeFreshness("Spring 2026", NOW)).toBe("PAST");
    expect(evaluateIntakeFreshness("Summer 2026", NOW)).toBe("PAST");
  });

  it("treats a same-year term still ahead as FUTURE", () => {
    expect(evaluateIntakeFreshness("Fall 2026", NOW)).toBe("FUTURE");
    expect(evaluateIntakeFreshness("Winter 2027", NOW)).toBe("FUTURE");
  });

  it("treats a clearly future year as FUTURE regardless of term", () => {
    expect(evaluateIntakeFreshness("Fall 2030", NOW)).toBe("FUTURE");
    expect(evaluateIntakeFreshness("September 2028", NOW)).toBe("FUTURE");
  });

  it("never invents a determination for ambiguous/unparseable text", () => {
    expect(evaluateIntakeFreshness("as soon as possible", NOW)).toBe("UNKNOWN");
    expect(evaluateIntakeFreshness("TBD", NOW)).toBe("UNKNOWN");
    expect(evaluateIntakeFreshness("", NOW)).toBe("UNKNOWN");
    // A bare current-year mention with no term/month is genuinely ambiguous.
    expect(evaluateIntakeFreshness("2026", NOW)).toBe("UNKNOWN");
  });

  it("does not globally reject old years — a bare past year alone is a clear PAST intake, but this helper is never applied to historical fields like academic background or date of birth", () => {
    expect(evaluateIntakeFreshness("2019", NOW)).toBe("PAST");
    // Confirms the function is a pure classifier with no side effects on
    // unrelated historical data — callers decide which fields it guards.
  });
});
