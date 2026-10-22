import { requireCompanionAuth } from "@/lib/companion/auth";
import { matchDocumentsForCategory } from "@/lib/companion/documentMatch";
import { isCategory } from "@/lib/documents/categories";
import { parseSearchParams } from "@/lib/validation/http";
import { companionDocumentMatchQuerySchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

// Given a document category the Companion client has detected a form field
// wants (e.g. a file-upload field whose label says "English proficiency"),
// reports back whether the student's vault has exactly one matching
// document (safe to auto-attach), several (the caller must ask which one —
// see AskWhenUnsure in the panel UI), or none (needs the student's input).
// This endpoint never mints a signed URL itself — callers follow up against
// POST /api/companion/documents/[id]/link for the one they end up using.
export async function GET(request: Request) {
  const current = await requireCompanionAuth(request);
  if (!current.ok) return current.response;

  const query = parseSearchParams(request, companionDocumentMatchQuerySchema);
  if (!query.ok) return query.response;
  if (!isCategory(query.data.category)) return Response.json({ error: "Unknown document category." }, { status: 400 });

  const result = await matchDocumentsForCategory(current.profile.id, query.data.category);
  return Response.json(result);
}
