import { prisma } from "@/lib/prisma";

// Same normalization used client-side in desktop/panel/panel.js's
// normalizeQuestionKey() -- kept in sync by hand, same reason
// field-dictionary.js has no shared module with its server-side
// counterparts: this file runs in Node, that one in a sandboxed page.
export function normalizeQuestionKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 200);
}

// A free-form answer Companion collected directly from a student for a
// question outside SOUP's existing structured fields (field-dictionary.js's
// fixed vocabulary has no key for it, and neither does any PDF/HTML field
// SOUP already understands). This is the only durable memory of it --
// without this, the exact same question gets asked again on every later
// application. Upserts on (profileId, questionKey): a later answer is
// treated as the new truth, not a second opinion to reconcile.
export async function saveLearnedAnswer(profileId: string, label: string, value: string, source: string): Promise<void> {
  const questionKey = normalizeQuestionKey(label);
  const cleanValue = value.trim();
  if (!questionKey || !cleanValue) return;
  await prisma.companionLearnedAnswer.upsert({
    where: { profileId_questionKey: { profileId, questionKey } },
    create: { profileId, questionKey, questionLabel: label.trim().slice(0, 300), value: cleanValue.slice(0, 2000), source: source.slice(0, 160) },
    update: { questionLabel: label.trim().slice(0, 300), value: cleanValue.slice(0, 2000), source: source.slice(0, 160) },
  });
}

export type LearnedAnswerMap = Record<string, { value: string; label: string; source: string }>;

export async function getLearnedAnswers(profileId: string): Promise<LearnedAnswerMap> {
  const rows = await prisma.companionLearnedAnswer.findMany({ where: { profileId } });
  const out: LearnedAnswerMap = {};
  for (const row of rows) out[row.questionKey] = { value: row.value, label: row.questionLabel, source: `Learned from an earlier answer (${row.source})` };
  return out;
}
