import { prisma } from "@/lib/prisma";
import { requireCompanionAuth } from "@/lib/companion/auth";
import { parseJsonBody } from "@/lib/validation/http";
import { companionRunEventRequestSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

// The only write path for CompanionRunEvent — staff-facing visibility
// into the multi-application run (review verdicts, approvals, pause
// reasons), shown on /admin/companion. CompanionFillEvent already
// covered raw per-page fill counts; this is specifically everything the
// run itself decides that a plain fill count can't show.
export async function POST(request: Request) {
  const current = await requireCompanionAuth(request);
  if (!current.ok) return current.response;

  const parsed = await parseJsonBody(request, companionRunEventRequestSchema);
  if (!parsed.ok) return parsed.response;

  // Never trust a client-supplied applicationId beyond "one of this
  // profile's own applications" — drop it rather than reject the whole
  // event if it doesn't check out.
  let applicationId: string | null = null;
  if (parsed.data.applicationId) {
    const owned = await prisma.studentApplication.findFirst({ where: { id: parsed.data.applicationId, profileId: current.profile.id }, select: { id: true } });
    applicationId = owned?.id || null;
  }

  await prisma.companionRunEvent.create({
    data: {
      profileId: current.profile.id,
      applicationId,
      universityName: parsed.data.universityName,
      kind: parsed.data.kind,
      detail: parsed.data.detail,
    },
  });
  return Response.json({ ok: true });
}
