import { collectAIResult, parseJSONObject } from "@/lib/ai/collect";

export type ReviewFieldInput = { label: string; value: string; filled: boolean; source: string | null };
export type ReviewDocumentInput = { label: string; attached: boolean; fileName: string | null };

export type ApplicationReview = {
  overallReadiness: "STRONG" | "NEEDS_WORK" | "NOT_READY";
  summary: string;
  strengths: string[];
  gaps: Array<{ field: string; issue: string; suggestion: string }>;
  credibilityNotes: Array<{ field: string; concern: string; severity: "LOW" | "MEDIUM" | "HIGH" }>;
};

function clean(value: unknown, max = 600): string {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : "";
}

const VALID_READINESS = new Set(["STRONG", "NEEDS_WORK", "NOT_READY"]);
const VALID_SEVERITY = new Set(["LOW", "MEDIUM", "HIGH"]);

// Defensive parsing, not strict zod validation, on purpose: the shape we
// actually need is simple, and an AI JSON response that is 95% right (an
// extra field, a slightly-off enum casing) should still produce a usable
// review rather than being thrown away entirely — same posture as every
// other AI-structured-output consumer in this codebase (see
// parseJSONObject's callers).
function normalizeReview(raw: unknown): ApplicationReview {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const readiness = String(obj.overallReadiness ?? "").toUpperCase();
  const strengths = Array.isArray(obj.strengths) ? obj.strengths.map((s) => clean(s, 240)).filter(Boolean).slice(0, 10) : [];
  const gaps = Array.isArray(obj.gaps)
    ? obj.gaps
        .map((g) => (g && typeof g === "object" ? g as Record<string, unknown> : {}))
        .map((g) => ({ field: clean(g.field, 160), issue: clean(g.issue, 400), suggestion: clean(g.suggestion, 400) }))
        .filter((g) => g.issue)
        .slice(0, 15)
    : [];
  const credibilityNotes = Array.isArray(obj.credibilityNotes)
    ? obj.credibilityNotes
        .map((c) => (c && typeof c === "object" ? c as Record<string, unknown> : {}))
        .map((c) => ({ field: clean(c.field, 160), concern: clean(c.concern, 400), severity: VALID_SEVERITY.has(String(c.severity).toUpperCase()) ? String(c.severity).toUpperCase() as "LOW" | "MEDIUM" | "HIGH" : "LOW" as const }))
        .filter((c) => c.concern)
        .slice(0, 15)
    : [];
  return {
    overallReadiness: VALID_READINESS.has(readiness) ? readiness as ApplicationReview["overallReadiness"] : "NEEDS_WORK",
    summary: clean(obj.summary, 800) || "SOUP reviewed this application but did not return a usable summary.",
    strengths,
    gaps,
    credibilityNotes,
  };
}

const REVIEW_PROMPT = `You are SOUP's application-readiness reviewer. A student is about to submit a university or visa application, filled with help from SOUP Companion. You are given exactly what was detected on the real form and which supporting documents are being attached. Review it the way an experienced study-abroad counselor would in the final minutes before submission.

Rules:
- Base your review ONLY on the information given below. Never invent facts about the student, and never assume a field is wrong just because it is short — judge what is actually there.
- Be specific: reference the actual field labels/values given, not generic advice like "double-check your information."
- "Credibility" means the answer looks incomplete, implausible, or internally inconsistent (e.g. a one-word academic background where the form clearly wants a paragraph, a passport number with an obviously wrong format, a date of birth that makes this application implausible) — not a judgement of the student's honesty.
- A field that was simply not filled is a gap, not a credibility issue.
- No filler praise — only list a strength if it is genuinely notable.
- Keep every piece of text short and actionable.
- Return strict JSON only, matching this schema exactly. No markdown, no commentary outside the JSON.

{
  "overallReadiness": "STRONG" | "NEEDS_WORK" | "NOT_READY",
  "summary": "2-4 sentence plain-language overview of whether this is ready to submit",
  "strengths": ["short specific strength, omit entirely if none are notable"],
  "gaps": [{ "field": "field label or area", "issue": "what is missing or incomplete", "suggestion": "what to do about it" }],
  "credibilityNotes": [{ "field": "field label", "concern": "specific concern", "severity": "LOW" | "MEDIUM" | "HIGH" }]
}`;

export async function generateApplicationReview(input: { fields: ReviewFieldInput[]; documents: ReviewDocumentInput[]; context?: string | null }): Promise<ApplicationReview> {
  const fieldsBlock = input.fields.length
    ? input.fields.map((f) => `- ${f.label}: ${f.filled && f.value ? `"${f.value}"${f.source ? ` (source: ${f.source})` : ""}` : "NOT FILLED"}`).join("\n")
    : "(no fields were detected)";
  const documentsBlock = input.documents.length
    ? input.documents.map((d) => `- ${d.label}: ${d.attached ? `attached${d.fileName ? ` (${d.fileName})` : ""}` : "not attached"}`).join("\n")
    : "(no supporting documents apply to this form)";

  const result = await collectAIResult({
    system: REVIEW_PROMPT,
    messages: [{
      role: "user",
      content: `${input.context ? `Context: ${input.context}\n\n` : ""}DETECTED FORM FIELDS:\n${fieldsBlock}\n\nSUPPORTING DOCUMENTS:\n${documentsBlock}\n\nReview this application now.`,
    }],
    maxTokens: 1400,
    timeoutMs: 45_000,
  });
  return normalizeReview(parseJSONObject(result.text));
}
