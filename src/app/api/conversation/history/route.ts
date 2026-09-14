import { prisma } from "@/lib/prisma";
import type { ChatWorkflow } from "@prisma/client";
import { safeResearchSources } from "@/lib/security/urls";
import { requireApiProfile } from "@/lib/auth/apiUser";
import { parseJsonBody, parseSearchParams } from "@/lib/validation/http";
import { conversationHistoryQuerySchema, conversationHistoryResetSchema, conversationHistorySchema } from "@/lib/validation/schemas";

const WORKFLOWS = new Set(["RESUME", "COUNSELOR"]);

type IncomingMessage = { role: "USER" | "ASSISTANT"; content: string; metadata?: { source?: string; sources?: Array<{ title: string; url: string }> } };

function normalizeIncoming(body: { messages: Array<{ role: "user" | "assistant"; content: string; metadata?: { sources?: Array<{ title: string; url: string }> } }> }): IncomingMessage[] {
  return body.messages
      .map((message) => {
        const sources = safeResearchSources(message?.metadata?.sources, 12);
        return {
          role: message.role === "user" ? "USER" as const : "ASSISTANT" as const,
          content: String(message.content).trim().slice(0, 12_000),
          metadata: { source: "GUEST_IMPORT", ...(sources.length ? { sources } : {}) },
        };
      });
}

// Reconciliation must be driven only by what the student actually typed.
// Assistant-authored bubbles — including the client-only opening greeting,
// which is shown locally before any server session exists and is never
// persisted through the normal turn-saving path in /api/conversation/stream —
// are regenerable UI content, not evidence that the conversation diverged.
// Comparing full transcripts (including that greeting) meant every reload
// after the first real turn looked like a divergence purely because the
// greeting was present on one side, which forked a brand-new session and
// re-persisted the greeting as if it were real history. Comparing only the
// sequence of user-authored turns fixes that at the source while still
// detecting genuine guest-history divergence.
function userContentSequence(messages: { role: string; content: string }[]) {
  return messages.filter((message) => message.role === "USER").map((message) => message.content);
}

function sameTranscript(existing: { role: string; content: string }[], incoming: IncomingMessage[]) {
  const existingUserTurns = userContentSequence(existing);
  const incomingUserTurns = userContentSequence(incoming);
  if (existingUserTurns.length !== incomingUserTurns.length) return false;
  return existingUserTurns.every((content, index) => content === incomingUserTurns[index]);
}

export async function GET(request: Request) {
  const current = await requireApiProfile();
  if (!current.ok) return current.response;
  const profile = current.profile;
  const query = parseSearchParams(request, conversationHistoryQuerySchema);
  if (!query.ok) return query.response;
  const workflow = query.data.workflow;
  const session = await prisma.chatSession.findFirst({ where: { profileId: profile.id, workflow: workflow as ChatWorkflow, status: "IN_PROGRESS" }, orderBy: { updatedAt: "desc" }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  return Response.json({ sessionId: session?.id || null, messages: session?.messages.map((message) => ({ id: message.id, role: message.role === "USER" ? "user" : "assistant", content: message.content, metadata: message.metadata || undefined, createdAt: message.createdAt.toISOString() })) || [] });
}

export async function POST(request: Request) {
  const current = await requireApiProfile();
  if (!current.ok) return current.response;
  const profile = current.profile;
  const parsed = await parseJsonBody(request, conversationHistorySchema);
  if (!parsed.ok) return parsed.response;
  const { workflow } = parsed.data;
  const incoming = normalizeIncoming(parsed.data);

  // The fork-or-reuse decision and its resulting mutations run inside one
  // transaction so two overlapping reconciliation requests for the same
  // profile/workflow (e.g. a re-run of the client's load effect, or a second
  // tab) cannot each independently decide to fork and create their own
  // duplicate session.
  const fresh = await prisma.$transaction(async (tx) => {
    let session = await tx.chatSession.findFirst({ where: { profileId: profile.id, workflow: workflow as ChatWorkflow, status: "IN_PROGRESS" }, orderBy: { updatedAt: "desc" }, include: { messages: { orderBy: { createdAt: "asc" } } } });

    if (incoming.length) {
      const currentTranscript = session?.messages.map((message) => ({ role: message.role, content: message.content })) || [];
      const hasGuestWork = incoming.some((message) => message.role === "USER");
      if (session && hasGuestWork && currentTranscript.length && !sameTranscript(currentTranscript, incoming)) {
        await tx.chatSession.update({ where: { id: session.id }, data: { status: "COMPLETED", lastSavedAt: new Date() } });
        session = null;
      }
    }

    if (!session) session = await tx.chatSession.create({ data: { profileId: profile.id, workflow: workflow as ChatWorkflow }, include: { messages: true } });
    if (session.messages.length === 0 && incoming.length) {
      await tx.chatMessage.createMany({ data: incoming.map((message) => ({ sessionId: session!.id, role: message.role, content: message.content, metadata: message.metadata })) });
    }
    return tx.chatSession.findUniqueOrThrow({ where: { id: session.id }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  });

  return Response.json({ sessionId: fresh.id, messages: fresh.messages.map((message) => ({ id: message.id, role: message.role === "USER" ? "user" : "assistant", content: message.content, metadata: message.metadata || undefined, createdAt: message.createdAt.toISOString() })) });
}

export async function DELETE(request: Request) {
  const current = await requireApiProfile();
  if (!current.ok) return current.response;
  const profile = current.profile;
  const parsed = await parseJsonBody(request, conversationHistoryResetSchema);
  if (!parsed.ok) return parsed.response;
  const { workflow } = parsed.data;
  await prisma.chatSession.updateMany({ where: { profileId: profile.id, workflow: workflow as ChatWorkflow, status: "IN_PROGRESS" }, data: { status: "COMPLETED", lastSavedAt: new Date() } });
  const session = await prisma.chatSession.create({ data: { profileId: profile.id, workflow: workflow as ChatWorkflow } });
  return Response.json({ sessionId: session.id });
}
