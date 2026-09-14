export type IntakeFreshness = "FUTURE" | "PAST" | "UNKNOWN";

// Approximate last month each term's admission window is still meaningfully
// "upcoming" rather than already underway/concluded. Intentionally coarse —
// this exists only to catch a clearly stale intake (e.g. "Fall 2025" proposed
// while the real date is September 2026), not to model every institution's
// exact academic calendar.
const TERM_END_MONTH: Record<string, number> = {
  spring: 4,
  winter: 2,
  summer: 8,
  fall: 12,
  autumn: 12,
};

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function parseTermYear(text: string): { term: string; year: number } | null {
  const termFirst = text.match(/\b(spring|summer|fall|autumn|winter)\b[^0-9]{0,10}(\d{4})\b/i);
  if (termFirst) return { term: termFirst[1].toLowerCase(), year: Number(termFirst[2]) };
  const yearFirst = text.match(/\b(\d{4})\b[^a-z0-9]{0,10}(spring|summer|fall|autumn|winter)\b/i);
  if (yearFirst) return { term: yearFirst[2].toLowerCase(), year: Number(yearFirst[1]) };
  return null;
}

function parseMonthYear(text: string): { month: number; year: number } | null {
  const match = text.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b[^0-9]{0,10}(\d{4})\b/i);
  if (!match) return null;
  const month = MONTH_NAMES.indexOf(match[1].toLowerCase()) + 1;
  return { month, year: Number(match[2]) };
}

/**
 * Determines whether a free-text application intake (e.g. "Fall 2025",
 * "September 2026", "2025") is already in the past relative to `now`. Only a
 * small set of common term/month + year patterns are recognized; anything
 * else is reported as UNKNOWN and MUST be left untouched by callers — SOUP
 * must never invent or silently rewrite an ambiguous intake. Old years remain
 * completely valid wherever they describe genuine history: this helper exists
 * only to guard proposed/preferred APPLICATION INTAKES, never academic
 * background, dates of birth, employment history, or other historical facts.
 */
export function evaluateIntakeFreshness(rawIntake: string, now: Date = new Date()): IntakeFreshness {
  const text = String(rawIntake || "").trim();
  if (!text) return "UNKNOWN";
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const termYear = parseTermYear(text);
  if (termYear) {
    if (termYear.year < currentYear) return "PAST";
    if (termYear.year > currentYear) return "FUTURE";
    const endMonth = TERM_END_MONTH[termYear.term] ?? 12;
    return endMonth < currentMonth ? "PAST" : "FUTURE";
  }

  const monthYear = parseMonthYear(text);
  if (monthYear) {
    if (monthYear.year < currentYear) return "PAST";
    if (monthYear.year > currentYear) return "FUTURE";
    return monthYear.month < currentMonth ? "PAST" : "FUTURE";
  }

  const bareYear = text.match(/\b(\d{4})\b/);
  if (bareYear) {
    const year = Number(bareYear[1]);
    if (year < currentYear) return "PAST";
    if (year > currentYear) return "FUTURE";
    // A bare current-year mention with no term/month is genuinely ambiguous —
    // never guess which part of the year was meant.
    return "UNKNOWN";
  }

  return "UNKNOWN";
}
