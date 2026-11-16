import { requireApiProfile } from "@/lib/auth/apiUser";
import { generateApplicationReview } from "@/lib/companion/review";
import { aiRateLimitResponse } from "@/lib/ai/httpRateLimit";
import { publicAIErrorMessage } from "@/lib/ai/types";
import { parseJsonBody } from "@/lib/validation/http";
import { companionReviewRequestSchema } from "@/lib/validation/schemas";
import { logServerError } from "@/lib/logging/safe";

export const runtime = "nodejs";
export const maxDuration = 60;

// Web counterpart to /api/companion/review: once the PDF review screen
// (src/components/companion/PdfFormFiller.tsx) has the student's final
// field values and chosen attachments in hand, it posts exactly that here
// and gets back an AI readiness review of the application as it is about
// to be downloaded — not a generic profile check.
export async function POST(request: Request) {
  const current = await requireApiProfile();
  if (!current.ok) return current.response;

  const limited = await aiRateLimitResponse(request, current.profile.id);
  if (limited) return limited;

  const parsed = await parseJsonBody(request, companionReviewRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const review = await generateApplicationReview(parsed.data);
    return Response.json({ review });
  } catch (error) {
    logServerError("COMPANION_PDF_REVIEW_ERROR", error);
    return Response.json({ error: publicAIErrorMessage(error) }, { status: 503 });
  }
}
