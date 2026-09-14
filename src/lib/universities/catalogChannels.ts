// Student-facing partnership/recruitment-channel labeling for the university
// catalogue. Deliberately generic and non-commercial: no commission figures,
// internal priority scores, or routing mechanics — only which channel SOUP
// would process an application through, which the student is entitled to
// understand as it affects how their own application gets handled.

export type CatalogChannel = "DIRECT_SOUP" | "AHZ" | "GRANDLINK" | "SOUP_CATALOGUE";

export const CHANNEL_LABELS: Record<CatalogChannel, string> = {
  DIRECT_SOUP: "SOUP Direct Partner",
  AHZ: "AHZ Partner Network",
  GRANDLINK: "Grandlink Partner Network",
  SOUP_CATALOGUE: "SOUP Catalogue",
};

export function deriveCatalogChannel(networks: string[], hasPartner: boolean): CatalogChannel {
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
