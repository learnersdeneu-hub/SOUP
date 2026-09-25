// Student-facing partnership/recruitment-channel labeling for the university
// catalogue. Deliberately generic and non-commercial: no commission figures,
// internal priority scores, or routing mechanics — only which channel SOUP
// would process an application through, which the student is entitled to
// understand as it affects how their own application gets handled.

export type CatalogChannel = "GOVERNMENT" | "DIRECT_SOUP" | "AHZ" | "GRANDLINK" | "SOUP_CATALOGUE";

export const CHANNEL_LABELS: Record<CatalogChannel, string> = {
  GOVERNMENT: "Government Partner Network",
  DIRECT_SOUP: "SOUP Direct Partner",
  AHZ: "AHZ Partner Network",
  GRANDLINK: "Grandlink Partner Network",
  SOUP_CATALOGUE: "SOUP Catalogue",
};

// GOVERNMENT takes priority over every other channel: a state/government
// partnership (e.g. Greece's public university network) is the strongest
// trust signal SOUP can show a student, and is checked first regardless of
// whether AHZ/GRANDLINK network tags are also present on the same row.
export function deriveCatalogChannel(networks: string[], hasPartner: boolean): CatalogChannel {
  if (networks.includes("GOVERNMENT")) return "GOVERNMENT";
  if (networks.includes("AHZ")) return "AHZ";
  if (networks.includes("GRANDLINK")) return "GRANDLINK";
  if (networks.includes("MASTERLIST")) return "SOUP_CATALOGUE";
  return hasPartner ? "DIRECT_SOUP" : "SOUP_CATALOGUE";
}

export function networksFromMetadata(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  const raw = (metadata as Record<string, unknown>).networks;
  return Array.isArray(raw) ? raw.map((value) => String(value || "").trim().toUpperCase()).filter(Boolean) : [];
}
