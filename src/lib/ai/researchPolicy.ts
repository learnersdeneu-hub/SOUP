import type { AIMessage } from "@/lib/ai/types";

const LIVE_FACT_STATIC_CUES = "current|currently|latest|today|now|this year|deadline|open applications?|intake open|tuition|fee|fees|requirement|requirements|eligibility|visa|embassy|appointment|processing time|scholarship deadline|availability|vacant|vacancy|price|pricing|insurance cover|official source";

// A hardcoded "2026|2027" cue would silently stop being useful once the
// calendar moves past it (or start missing a student asking about 2028+
// before it ships as a code change). Building the cue from the real
// request-time year instead keeps "mentions a near-term year" evergreen.
function liveFactCuesPattern(now: Date): RegExp {
  const currentYear = now.getFullYear();
  const nextYear = currentYear + 1;
  return new RegExp(`\\b(?:${LIVE_FACT_STATIC_CUES}|${currentYear}|${nextYear})\\b`, "i");
}
const EXPLICIT_RESEARCH_CUES = /\b(search|look up|check online|verify online|research|official website|web|google)\b/i;
const UNIVERSITY_DISCOVERY_CUES = /\b(find|show|recommend|suggest|options?|shortlist|match|universit|college|program|course|study abroad|admission)\b/i;
const PUBLIC_ONLY_CUES = /\b(public|government|state)[ -]?(universit|college)|\bpublic only\b|\bgovernment only\b/i;
const STRICT_BUDGET_CUES = /\b(max(?:imum)?|under|below|up to|no more than|budget)\b.{0,24}(?:[$€£]|usd|eur|gbp|pkr|rupees?|euros?|pounds?)|(?:[$€£]\s?\d|\d[\d,.]*\s?(?:usd|eur|gbp|pkr|euros?|pounds?))/i;

/**
 * Web grounding is deliberately selective: database-first keeps ordinary chat fast,
 * while public-only, strict-budget, missing-catalog and time-sensitive admissions
 * questions automatically receive current research. We inspect recent turns as well
 * as saved case context so a short answer such as “€5,000” can still trigger the
 * university search the preceding conversation established.
 */
export function shouldEnableCounselorWebResearch(messages: AIMessage[], savedContext = "", now: Date = new Date()) {
  const recent = messages.slice(-10).map((message) => message.content).join("\n");
  const latest = [...messages].reverse().find((message) => message.role === "user")?.content || "";
  const combined = `${recent}\n${savedContext.slice(0, 18_000)}`;

  if (liveFactCuesPattern(now).test(latest) || EXPLICIT_RESEARCH_CUES.test(latest)) return true;
  if (PUBLIC_ONLY_CUES.test(combined)) return true;

  const countMatch = savedContext.match(/"catalogOptionCount":(\d+)/);
  const catalogCount = countMatch ? Number(countMatch[1]) : 0;
  const universityJourneyActive = UNIVERSITY_DISCOVERY_CUES.test(recent);

  // A broad first shortlist targets roughly ten genuinely suitable options. If the
  // local catalog cannot even supply that many candidates, research should fill the
  // gap rather than forcing Noodles to pad the list.
  if (universityJourneyActive && catalogCount < 10) return true;

  // Tight budgets frequently make public universities the correct answer. This is
  // intentionally paired with university intent so ordinary payment questions do not
  // unnecessarily invoke grounding.
  if (universityJourneyActive && STRICT_BUDGET_CUES.test(combined)) return true;

  return false;
}
