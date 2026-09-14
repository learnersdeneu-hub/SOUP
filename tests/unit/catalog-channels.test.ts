import { describe, expect, it } from "vitest";
import { deriveCatalogChannel, networksFromMetadata } from "../../src/lib/universities/catalogChannels";

describe("deriveCatalogChannel", () => {
  it("labels an AHZ-sourced university as AHZ regardless of partner link", () => {
    expect(deriveCatalogChannel(["AHZ"], false)).toBe("AHZ");
    expect(deriveCatalogChannel(["AHZ"], true)).toBe("AHZ");
  });

  it("labels a Grandlink-sourced university as GRANDLINK", () => {
    expect(deriveCatalogChannel(["GRANDLINK"], true)).toBe("GRANDLINK");
  });

  it("does not overclaim partner status for masterlist-only entries", () => {
    expect(deriveCatalogChannel(["MASTERLIST"], false)).toBe("SOUP_CATALOGUE");
  });

  it("treats a partner-linked university with no network tag as a direct SOUP partner", () => {
    expect(deriveCatalogChannel([], true)).toBe("DIRECT_SOUP");
  });

  it("falls back to the generic catalogue label when nothing else applies", () => {
    expect(deriveCatalogChannel([], false)).toBe("SOUP_CATALOGUE");
  });
});

describe("networksFromMetadata", () => {
  it("reads and normalizes a networks array from publicMetadata", () => {
    expect(networksFromMetadata({ networks: ["ahz", " Grandlink "] })).toEqual(["AHZ", "GRANDLINK"]);
  });

  it("returns an empty array for missing/malformed metadata", () => {
    expect(networksFromMetadata(null)).toEqual([]);
    expect(networksFromMetadata({})).toEqual([]);
    expect(networksFromMetadata({ networks: "not-an-array" })).toEqual([]);
  });
});
