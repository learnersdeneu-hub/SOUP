import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/validation/http";
import { companionFillEventSchema } from "@/lib/validation/schemas";
import { requireCompanionAuth } from "@/lib/companion/auth";

export const runtime = "nodejs";

// A durable record of what the Companion actually did on a page, mirroring
// the event-ledger pattern already used for StudentApplicationEvent — so
// staff/support can see Companion activity on the same student case timeline
// rather than it being invisible to everyone but the browser.
export async function POST(request: Request) {
  const current = await requireCompanionAuth(request);
  if (!current.ok) return current.response;
  const parsed = await parseJsonBody(request, companionFillEventSchema);
  if (!parsed.ok) return parsed.response;
  const { portalHost, pageUrl, fieldsDetected, fieldsFilled, fieldsNeedInput, outcome } = parsed.data;
  const event = await prisma.companionFillEvent.create({
    data: {
      profileId: current.profile.id,
      deviceId: current.device.id,
      portalHost: portalHost.slice(0, 255),
      pageUrl: pageUrl.slice(0, 2000),
      fieldsDetected,
      fieldsFilled,
      fieldsNeedInput,
      outcome,
    },
  });
  return Response.json({ id: event.id });
}
