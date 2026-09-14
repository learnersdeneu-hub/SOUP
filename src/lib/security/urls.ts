export function safeHttpUrl(value: unknown, maxLength = 1500) {
  const raw = String(value ?? "").trim();
  if (!raw || raw.length > maxLength) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    // Credentials in AI-generated/retrieved URLs are never useful to students and
    // can be deceptive. Reject them rather than rendering them into the product.
    if (parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function safeResearchSources(value: unknown, limit = 12) {
  if (!Array.isArray(value)) return [] as Array<{ title: string; url: string }>;
  const seen = new Set<string>();
  const sources: Array<{ title: string; url: string }> = [];
  for (const item of value) {
    const raw = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
    const url = safeHttpUrl(raw.url, 1500);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    sources.push({ title: String(raw.title || "Research source").trim().slice(0, 240) || "Research source", url });
    if (sources.length >= limit) break;
  }
  return sources;
}
