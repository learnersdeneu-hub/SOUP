import { RateLimitError } from "@/lib/ai/types";
import { checkRateLimit } from "@/lib/ai/rateLimiter";

export async function aiRateLimitResponse(request: Request, authenticatedSubject?: string | null) {
  try {
    await checkRateLimit(request, authenticatedSubject);
    return null;
  } catch (error) {
    if (!(error instanceof RateLimitError)) throw error;
    return Response.json(
      { error: "Too many AI-assisted actions in a short period. Please wait a moment and continue." },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil(error.retryAfterMs / 1000))) } },
    );
  }
}
