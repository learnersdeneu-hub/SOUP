import { requireCompanionAuth } from "@/lib/companion/auth";
import { saveLearnedAnswer } from "@/lib/companion/learnedAnswers";
import { parseJsonBody } from "@/lib/validation/http";
import { companionLearnedAnswerRequestSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

// Write-back for a question Companion had no answer for at all (see
// desktop/panel/panel.js's saveAnswer()) — the only durable memory of it,
// so the same question doesn't get re-asked on the student's next
// application. Never used for a field SOUP's dictionary already
// recognizes; that belongs in the student's real structured profile data,
// a separate concern this endpoint does not touch.
export async function POST(request: Request) {
  const current = await requireCompanionAuth(request);
  if (!current.ok) return current.response;

  const parsed = await parseJsonBody(request, companionLearnedAnswerRequestSchema);
  if (!parsed.ok) return parsed.response;

  await saveLearnedAnswer(current.profile.id, parsed.data.label, parsed.data.value, "Companion desktop");
  return Response.json({ ok: true });
}
