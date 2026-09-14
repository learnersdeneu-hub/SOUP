import { prisma } from "@/lib/prisma";
import type { ChatWorkflow } from "@prisma/client";
import { requireApiProfile } from "@/lib/auth/apiUser";
import { parseJsonBody, parseSearchParams } from "@/lib/validation/http";
import { conversationSessionCreateSchema, conversationSessionDeleteSchema, conversationSessionQuerySchema, conversationSessionRenameSchema } from "@/lib/validation/schemas";

const WORKFLOWS = new Set(["RESUME", "COUNSELOR"]);

async function ownedSession(id: string, profileId: string) {
  const session = await prisma.chatSession.findUnique({ where: { id } });
  if (!session || session.profileId !== profileId) return null;
  return session;
}

export async function GET(request: Request) {
  const current = await requireApiProfile();
  if (!current.ok) return current.response;
  const profile = current.profile;
  const query = parseSearchParams(request, conversationSessionQuerySchema);
  if (!query.ok) return query.response;
  const id = query.data.id;
  if (id) {
    const session = await prisma.chatSession.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: "asc" } } } });
    if (!session || session.profileId !== profile.id) return Response.json({ error: "Conversation not found." }, { status: 404 });
    return Response.json({
      session: { id: session.id, workflow: session.workflow, title: session.title, status: session.status, updatedAt: session.updatedAt.toISOString() },
      messages: session.messages.map((message) => ({ id: message.id, role: message.role === "USER" ? "user" : "assistant", content: message.content, metadata: message.metadata || undefined, createdAt: message.createdAt.toISOString() })),
    });
  }
  const sessions = await prisma.chatSession.findMany({ where: { profileId: profile.id }, orderBy: { updatedAt: "desc" }, take: 60 });
  return Response.json({ sessions: sessions.map((session) => ({ id: session.id, workflow: session.workflow, title: session.title, status: session.status, updatedAt: session.updatedAt.toISOString() })) });
}

export async function POST(request: Request) {
  const current = await requireApiProfile();
  if (!current.ok) return current.response;
  const profile = current.profile;
  const parsed = await parseJsonBody(request, conversationSessionCreateSchema);
  if (!parsed.ok) return parsed.response;
  const workflow = parsed.data.workflow || "COUNSELOR";
  const session = await prisma.chatSession.create({ data: { profileId: profile.id, workflow: workflow as ChatWorkflow, title: parsed.data.title || null } });
  return Response.json({ session: { id: session.id, workflow: session.workflow, title: session.title, status: session.status, updatedAt: session.updatedAt.toISOString() } });
}

export async function PATCH(request: Request) {
  const current = await requireApiProfile();
  if (!current.ok) return current.response;
  const profile = current.profile;
  const parsed = await parseJsonBody(request, conversationSessionRenameSchema);
  if (!parsed.ok) return parsed.response;
  const { id, title } = parsed.data;
  const session = await ownedSession(id, profile.id);
  if (!session) return Response.json({ error: "Conversation not found." }, { status: 404 });
  const updated = await prisma.chatSession.update({ where: { id }, data: { title: title || null } });
  return Response.json({ session: { id: updated.id, workflow: updated.workflow, title: updated.title, status: updated.status, updatedAt: updated.updatedAt.toISOString() } });
}

export async function DELETE(request: Request) {
  const current = await requireApiProfile();
  if (!current.ok) return current.response;
  const profile = current.profile;
  const parsed = await parseJsonBody(request, conversationSessionDeleteSchema);
  if (!parsed.ok) return parsed.response;
  const { id } = parsed.data;
  const session = await ownedSession(id, profile.id);
  if (!session) return Response.json({ error: "Conversation not found." }, { status: 404 });
  await prisma.chatMessage.deleteMany({ where: { sessionId: id } });
  await prisma.chatSession.delete({ where: { id } });
  return Response.json({ id });
}
