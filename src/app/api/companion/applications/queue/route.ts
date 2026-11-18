import { prisma } from "@/lib/prisma";
import { requireCompanionAuth } from "@/lib/companion/auth";
import { buildApplicationQueue } from "@/lib/companion/applicationRun";
import { aiRateLimitResponse } from "@/lib/ai/httpRateLimit";
import { parseJsonBody } from "@/lib/validation/http";
import { companionApplicationQueueRequestSchema } from "@/lib/validation/schemas";
import { logServerError } from "@/lib/logging/safe";

export const runtime = "nodejs";
export const maxDuration = 60;

// Starts a multi-application Companion run: given an ordered list of the
// student's own StudentApplication ids (from the "Start applications"
// picker, sourced from My Colleges), resolves where to actually go for
// each one and what SOUP's existing checklist already requires. The
// desktop panel drives the actual tab-opening/filling/review loop from
// this; this endpoint only resolves the plan.
export async function POST(request: Request) {
  const current = await requireCompanionAuth(request);
  if (!current.ok) return current.response;

  const limited = await aiRateLimitResponse(request, current.profile.id);
  if (limited) return limited;

  const parsed = await parseJsonBody(request, companionApplicationQueueRequestSchema);
  if (!parsed.ok) return parsed.response;

  // Never trust the id list beyond "which of this profile's own runnable
  // applications to include" — silently drop anything that is not
  // actually this student's own SOUP_MANAGED application, rather than
  // erroring the whole request over one bad id.
  const owned = await prisma.studentApplication.findMany({
    where: { id: { in: parsed.data.applicationIds }, profileId: current.profile.id, ownership: "SOUP_MANAGED" },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((a) => a.id));
  const orderedIds = parsed.data.applicationIds.filter((id) => ownedIds.has(id));
  if (!orderedIds.length) return Response.json({ error: "None of those applications belong to you." }, { status: 403 });

  try {
    const queue = await buildApplicationQueue(orderedIds);
    return Response.json({ queue });
  } catch (error) {
    logServerError("COMPANION_APPLICATION_QUEUE_ERROR", error);
    return Response.json({ error: "Could not prepare the application run right now. Try again." }, { status: 503 });
  }
}
