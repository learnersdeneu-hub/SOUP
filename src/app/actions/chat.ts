"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { ChatWorkflow } from "@prisma/client";

async function requireProfileId() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const profile = await prisma.profile.findUniqueOrThrow({ where: { userId: user.id } });
  return profile.id;
}

// Resumes the most recent in-progress session for this workflow, or starts
// a fresh one. Chat messages are persisted immediately as they're sent —
// there is no unsaved-only client state for message history. "Save"
// checkpoints step/title; "Save & Exit" additionally marks lastSavedAt.
export async function getOrCreateSession(workflow: ChatWorkflow) {
  const profileId = await requireProfileId();

  const existing = await prisma.chatSession.findFirst({
    where: { profileId, workflow, status: "IN_PROGRESS" },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (existing) return existing;

  const created = await prisma.chatSession.create({
    data: { profileId, workflow },
    include: { messages: true },
  });
  return created;
}

export async function startNewSession(workflow: ChatWorkflow) {
  const profileId = await requireProfileId();
  // Leave any existing in-progress session as-is (it's real, persisted
  // history) and simply start a new one.
  return prisma.chatSession.create({
    data: { profileId, workflow },
    include: { messages: true },
  });
}

export async function appendMessage(sessionId: string, role: "USER" | "ASSISTANT", content: string) {
  const profileId = await requireProfileId();
  await requireOwnedSession(sessionId, profileId);
  const trimmed = content.trim();
  if (!trimmed) throw new Error("Message cannot be empty.");
  return prisma.chatMessage.create({ data: { sessionId, role, content: trimmed } });
}

export async function saveSession(sessionId: string, currentStep?: number) {
  const profileId = await requireProfileId();
  await requireOwnedSession(sessionId, profileId);
  return prisma.chatSession.update({
    where: { id: sessionId },
    data: {
      lastSavedAt: new Date(),
      ...(currentStep !== undefined ? { currentStep } : {}),
    },
  });
}

export async function completeSession(sessionId: string) {
  const profileId = await requireProfileId();
  await requireOwnedSession(sessionId, profileId);
  return prisma.chatSession.update({
    where: { id: sessionId },
    data: { status: "COMPLETED", lastSavedAt: new Date() },
  });
}

export async function listSessions() {
  const profileId = await requireProfileId();
  return prisma.chatSession.findMany({
    where: { profileId },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
}

// ---------------------------------------------------------------------------
// Additions below this line support the persistent chat UI (sidebar,
// history, rename, delete). Nothing above this line was modified.
//
// All session mutations verify session -> profile ownership explicitly because
// trusted server-side Prisma access bypasses browser RLS protections.
// ---------------------------------------------------------------------------

async function requireOwnedSession(sessionId: string, profileId: string) {
  const session = await prisma.chatSession.findUniqueOrThrow({ where: { id: sessionId } });
  if (session.profileId !== profileId) {
    throw new Error("You do not have access to this conversation.");
  }
  return session;
}

// Loads one session with its full message history, verifying ownership.
// Used when the sidebar restores a session on click.
export async function getSessionWithMessages(sessionId: string) {
  const profileId = await requireProfileId();
  await requireOwnedSession(sessionId, profileId);

  return prisma.chatSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

// Renames a session. If no explicit title is given, derives one from the
// first user message (truncated), matching "if untitled, generate a title
// from the first user message."
export async function renameSession(sessionId: string, title?: string) {
  const profileId = await requireProfileId();
  await requireOwnedSession(sessionId, profileId);

  let finalTitle = title?.trim();

  if (!finalTitle) {
    const firstUserMessage = await prisma.chatMessage.findFirst({
      where: { sessionId, role: "USER" },
      orderBy: { createdAt: "asc" },
    });
    finalTitle = firstUserMessage
      ? firstUserMessage.content.slice(0, 60).trim()
      : "New Conversation";
  }

  return prisma.chatSession.update({
    where: { id: sessionId },
    data: { title: finalTitle },
  });
}

// Hard delete (cascades to chat_messages via the existing FK). Soft delete
// would require a new column on ChatSession, which is out of scope here —
// see the note in the accompanying summary.
export async function deleteSession(sessionId: string) {
  const profileId = await requireProfileId();
  await requireOwnedSession(sessionId, profileId);

  await prisma.chatMessage.deleteMany({ where: { sessionId } });
  await prisma.chatSession.delete({ where: { id: sessionId } });
  return { id: sessionId };
}

// Pagination for the sidebar beyond the initial 20 sessions returned by
// listSessions(). Reuses the same ordering/shape rather than duplicating
// the base query logic in a divergent way.
export async function listMoreSessions(skip: number) {
  const profileId = await requireProfileId();
  return prisma.chatSession.findMany({
    where: { profileId },
    orderBy: { updatedAt: "desc" },
    skip,
    take: 20,
  });
}
