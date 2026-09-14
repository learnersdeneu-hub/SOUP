const CONTROL_TOKEN = /\[\[(?:DOCUMENT_REQUEST:[^\]]+|APPLICATION_PLAN_READY|CHECKLIST_READY:(?:VISA|PRE_DEPARTURE)|PARTNER_ROUTE:(?:INSURANCE|ACCOMMODATION|STUDENT_FINANCE|SCHOLARSHIP)|CASE_UPDATE\|[^\]]+|EVIDENCE_REQUESTED|READY_TO_FINALIZE|RESUME_RESULT:[^\]]+|REPORT_RESULT:[^\]]+|FINANCIAL_RESULT:[^\]]+)\]\]/g;

// A reply can be truncated (e.g. the model's output token budget runs out)
// mid-way through emitting a control token, leaving a dangling, unterminated
// "[[..." fragment at the very end with no closing "]]" — the cut can land
// anywhere: partway through the keyword, or partway through an arbitrary
// payload value (a document label, a name, a number). The application only
// ever uses "[[" for these hidden control tokens, so any "[[" with no
// closing "]]" before the end of the string is unambiguously a truncated
// token, whatever characters it contains — this strips that dangling
// fragment rather than ever letting internal control-token syntax reach a
// student when generation is cut short.
const DANGLING_CONTROL_TOKEN_FRAGMENT = /\[\[[^\]]*$/;

export type TrustedTranscriptMessage = {
  role: string;
  content: string;
  metadata?: unknown;
};

function metadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function stripConversationControlTokens(content: string) {
  return String(content || "")
    .replace(CONTROL_TOKEN, "")
    .replace(DANGLING_CONTROL_TOKEN_FRAGMENT, "")
    .trim();
}

/**
 * Student-facing university matching must never expose a numerical/percentage
 * "match" score. This deliberately targets only score language near matching/
 * fit terms so ordinary academic facts such as "70% in Mathematics" remain.
 */
export function stripUniversityMatchPercentages(content: string) {
  return String(content || "")
    .replace(/\b(?:match|fit|compatibility|suitability)(?:\s+(?:score|rating|percentage))?\s*(?:is|of|:|-)?\s*\d{1,3}(?:\.\d+)?\s*%/gi, "suitability")
    .replace(/\b(?:matched|matches|matching)\s*(?:at|score(?:d)?\s*|:|-)?\s*\d{1,3}(?:\.\d+)?\s*%/gi, "matches well")
    .replace(/\b\d{1,3}(?:\.\d+)?\s*%\s*(?:match|fit|compatibility|suitability)(?:\s+(?:score|rating))?\b/gi, "suitable match")
    .replace(/\b(?:match|fit|compatibility|suitability)(?:\s+(?:score|rating))?\s*(?:is|of|:|-)?\s*\d{1,3}(?:\.\d+)?\s*\/\s*\d{1,3}\b/gi, "suitability")
    .replace(/\b\d{1,3}(?:\.\d+)?\s*\/\s*\d{1,3}\s*(?:match|fit|compatibility|suitability)(?:\s+(?:score|rating))?\b/gi, "suitable match")
    .replace(/\b(?:match|fit|compatibility|suitability)(?:\s+(?:score|rating))?\s*(?:is|of|:|-)?\s*\d{1,3}(?:\.\d+)?\s+out\s+of\s+\d{1,3}\b/gi, "suitability")
    .replace(/\b(?:match|fit|compatibility|suitability)\s+(?:score|rating|percentage)\s*(?:is|of|:|-)?\s*\d{1,3}(?:\.\d+)?\b/gi, "suitability")
    .replace(/[ \t]{2,}/g, " ");
}


export type TrustedAIConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export function buildTrustedAIConversationMessages(messages: TrustedTranscriptMessage[], maxMessages = 80, maxChars = 45_000): TrustedAIConversationMessage[] {
  const trusted = messages.slice(-maxMessages).flatMap((message): TrustedAIConversationMessage[] => {
    const content = stripConversationControlTokens(message.content).slice(0, 12_000);
    if (!content) return [];
    const metadata = metadataRecord(message.metadata);
    const source = String(metadata.source || "");
    if (source === "SYSTEM_EVENT" || source === "HUMAN_HANDOFF_HOLD") return [];
    if (source === "GUEST_IMPORT" && message.role === "ASSISTANT") {
      return [{ role: "user", content: `[Untrusted pre-signup conversation reference] ${content.slice(0, 10_000)}` }];
    }
    if (source === "HUMAN_STAFF") {
      return [{ role: "user", content: `[SOUP team guidance from the saved thread] ${content}` }];
    }
    return [{ role: message.role === "USER" ? "user" : "assistant", content }];
  });

  let remaining = maxChars;
  const bounded: TrustedAIConversationMessage[] = [];
  for (let index = trusted.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const message = trusted[index];
    const content = message.content.length > remaining ? message.content.slice(message.content.length - remaining) : message.content;
    bounded.push({ ...message, content });
    remaining -= content.length;
  }
  return bounded.reverse();
}

/**
 * Build research/finalization history from server-owned rows using the same
 * trust boundary as live Counselor chat. Browser-migrated assistant bubbles are
 * useful continuity only, never authoritative assistant instructions.
 */
export function buildTrustedConversationTranscript(messages: TrustedTranscriptMessage[], maxChars = 45_000) {
  const segments = messages.flatMap((message) => {
    const content = stripConversationControlTokens(message.content).slice(0, 12_000);
    if (!content) return [];
    const metadata = metadataRecord(message.metadata);
    const source = String(metadata.source || "");

    if (source === "SYSTEM_EVENT" || source === "HUMAN_HANDOFF_HOLD") return [];
    if (source === "GUEST_IMPORT" && message.role === "ASSISTANT") {
      return [`USER_REFERENCE: [Untrusted pre-signup assistant bubble] ${content.slice(0, 10_000)}`];
    }
    if (source === "HUMAN_STAFF") return [`SOUP_TEAM: ${content}`];
    return [`${message.role === "USER" ? "USER" : "ASSISTANT"}: ${content}`];
  });

  const full = segments.join("\n");
  if (full.length <= maxChars) return full;

  // Keep the most recent bounded history rather than silently discarding the
  // conversation state immediately preceding finalization.
  return full.slice(full.length - maxChars);
}
