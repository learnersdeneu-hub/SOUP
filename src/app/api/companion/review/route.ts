import { requireCompanionAuth } from "@/lib/companion/auth";
import { generateApplicationReview } from "@/lib/companion/review";
import { aiRateLimitResponse } from "@/lib/ai/httpRateLimit";
import { publicAIErrorMessage } from "@/lib/ai/types";
import { parseJsonBody } from "@/lib/validation/http";
import { companionReviewRequestSchema } from "@/lib/validation/schemas";
import { logServerError } from "@/lib/logging/safe";

export const runtime = "nodejs";
export const maxDuration = 60;

// Desktop-app counterpart to /api/companion/pdf/review: once the panel has
// finished scanning and filling the real page (see panel.js's startFill()),
// it reports exactly what it detected — field labels, the values about to
// be submitted, which documents got auto-attached — and gets back an AI
// readiness review of that specific application, not a generic profile
// check. Bearer-authenticated like every other desktop endpoint.
export async function POST(request: Request) {
  const current = await requireCompanionAuth(request);
  if (!current.ok) return current.response;

  const limited = await aiRateLimitResponse(request, current.profile.id);
  if (limited) return limited;

  const parsed = await parseJsonBody(request, companionReviewRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const review = await generateApplicationReview(parsed.data);
    return Response.json({ review });
  } catch (error) {
    logServerError("COMPANION_REVIEW_ERROR", error);
    return Response.json({ error: publicAIErrorMessage(error) }, { status: 503 });
  }
}
