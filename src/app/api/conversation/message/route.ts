import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isSupersededChecklist } from "@/lib/journey/checklists";
import type { Prisma } from "@prisma/client";
import { parseJsonBody } from "@/lib/validation/http";
import { conversationPersistMessageSchema } from "@/lib/validation/schemas";

const ACTIVE_WORKFLOWS = new Set(["COUNSELOR", "RESUME"]);

type TrustedEvent = {
  content: string;
  metadata: Prisma.InputJsonObject;
};

async function trustedEvent(profileId: string, workflow: string, metadata: Record<string, unknown>): Promise<TrustedEvent | null> {
  const shortlistId = String(metadata.shortlistId || "").trim();
  if (shortlistId && workflow === "COUNSELOR") {
    const plan = await prisma.universityShortlist.findFirst({
      where: { id: shortlistId, profileId },
      include: { _count: { select: { items: true } } },
    });
    if (!plan) return null;
    return {
      content: `Your University Application Plan v${plan.version} is saved in My SOUP with ${plan._count.items} university option${plan._count.items === 1 ? "" : "s"}. You can reopen or download it from your saved plans.`,
      metadata: { source: "SYSTEM_EVENT", eventType: "APPLICATION_PLAN_SAVED", shortlistId: plan.id },
    };
  }

  const checklistId = String(metadata.checklistId || "").trim();
  if (checklistId && workflow === "COUNSELOR") {
    const checklist = await prisma.journeyChecklist.findFirst({
      where: { id: checklistId, profileId },
      include: { _count: { select: { items: true } } },
    });
    if (!checklist || isSupersededChecklist(checklist.sourceSnapshot)) return null;
    return {
      content: `${checklist.title} is saved in My SOUP with ${checklist._count.items} trackable requirement${checklist._count.items === 1 ? "" : "s"}. Continue it from the Counselor or Journey dashboard.`,
      metadata: { source: "SYSTEM_EVENT", eventType: "CHECKLIST_SAVED", checklistId: checklist.id },
    };
  }

  const documentId = String(metadata.documentId || "").trim();
  if (documentId && workflow === "COUNSELOR") {
    const document = await prisma.document.findFirst({ where: { id: documentId, profileId } });
    if (!document) return null;
    const analysis = document.aiAnalysis && typeof document.aiAnalysis === "object" && !Array.isArray(document.aiAnalysis)
      ? document.aiAnalysis as Record<string, unknown>
      : {};
    const summary = String(analysis.summary || "").trim().slice(0, 1600);
    return {
      content: `SOUP processed ${document.originalFileName} and saved it in your document vault.${summary ? `\n\n${summary}` : ""}`,
      metadata: { source: "SYSTEM_EVENT", eventType: "DOCUMENT_PROCESSED", documentId: document.id },
    };
  }

  const resumeId = String(metadata.resumeId || "").trim();
  if (resumeId && workflow === "RESUME") {
    const resume = await prisma.resume.findFirst({ where: { id: resumeId, profileId } });
    if (!resume) return null;
    return {
      content: `Your resume and cover letter files are ready. You can download them below or reopen this conversation later.\n[[RESUME_RESULT:${resume.id}]]`,
      metadata: { source: "SYSTEM_EVENT", eventType: "RESUME_READY", resumeId: resume.id },
    };
  }

  return null;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!profile) return Response.json({ error: "Profile not found." }, { status: 404 });

  const parsed = await parseJsonBody(request, conversationPersistMessageSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const sessionId = String(body?.sessionId || "").trim();
  const rawMetadata = body?.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
    ? body.metadata as Record<string, unknown>
    : {};
  if (!sessionId) return Response.json({ error: "Conversation is required." }, { status: 400 });

  const session = await prisma.chatSession.findFirst({ where: { id: sessionId, profileId: profile.id } });
  if (!session || !ACTIVE_WORKFLOWS.has(session.workflow)) return Response.json({ error: "Conversation not found." }, { status: 404 });

  const event = await trustedEvent(profile.id, session.workflow, rawMetadata);
  if (!event) return Response.json({ error: "This conversation event could not be verified against your SOUP account." }, { status: 400 });

  const existing = await prisma.chatMessage.findFirst({
    where: { sessionId, role: "ASSISTANT", content: event.content },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return Response.json({ messageId: existing.id, duplicate: true, content: existing.content, metadata: existing.metadata });

  const message = await prisma.chatMessage.create({ data: { sessionId, role: "ASSISTANT", content: event.content, metadata: event.metadata } });
  await prisma.chatSession.update({ where: { id: sessionId }, data: { lastSavedAt: new Date() } });
  return Response.json({ messageId: message.id, content: message.content, metadata: message.metadata });
}
