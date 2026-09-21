import { prisma } from "@/lib/prisma";
import { requireApiProfile } from "@/lib/auth/apiUser";
import { parseJsonBody } from "@/lib/validation/http";
import { dismissDocumentRequestSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

// Backs the dismiss ("X") control on a document-request card in the
// Counselor chat. The card itself is hidden immediately client-side; this
// route makes the dismissal durable in the actual conversation Noodles
// reads, by saving it as a normal, trusted USER-authored chat turn (the same
// prisma.chatMessage.create shape /api/conversation/stream already uses) —
// scoped to the caller's own profile, so it can only ever affect their own
// session. No new "memory" system: the next real AI turn simply sees this in
// its ordinary saved history and, per the existing "never re-ask a known
// fact" instruction in the system prompt, treats it the same as any other
// explicit student instruction.
export async function POST(request: Request) {
  const current = await requireApiProfile();
  if (!current.ok) return current.response;
  const parsed = await parseJsonBody(request, dismissDocumentRequestSchema);
  if (!parsed.ok) return parsed.response;
  const { sessionId, documentLabel } = parsed.data;

  const session = sessionId
    ? await prisma.chatSession.findFirst({ where: { id: sessionId, profileId: current.profile.id, workflow: "COUNSELOR" } })
    : await prisma.chatSession.findFirst({ where: { profileId: current.profile.id, workflow: "COUNSELOR", status: "IN_PROGRESS" }, orderBy: { updatedAt: "desc" } });
  if (!session) return Response.json({ error: "No active conversation to update." }, { status: 404 });

  await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      role: "USER",
      content: `I'm dismissing the request for "${documentLabel}" from the chat for now. Please don't ask me for it again unless it becomes genuinely necessary for a new step.`,
      metadata: { source: "DOCUMENT_REQUEST_DISMISSED" },
    },
  });
  await prisma.chatSession.update({ where: { id: session.id }, data: { lastSavedAt: new Date() } });

  return Response.json({ ok: true });
}
