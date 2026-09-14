"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/currentUser";
import { CASE_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { ensureStudentCase } from "@/lib/student/case";

async function assertCaseAccess(profileId: string) {
  const current = await requireRole(CASE_ROLES);
  if (current.user.role === "SUPPORT") {
    const assigned = await prisma.supportTicket.findFirst({
      where: { profileId, assignedToUserId: current.user.id },
      select: { id: true },
    });
    if (!assigned) throw new Error("This student is not assigned to your support queue.");
  }
  return current;
}

async function getCounselorSession(profileId: string, sessionId: string) {
  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, profileId, workflow: "COUNSELOR" },
  });
  if (!session) throw new Error("Counselor conversation not found for this student.");
  return session;
}

export async function setCounselorHandoff(profileId: string, sessionId: string, active: boolean, formData?: FormData) {
  const current = await assertCaseAccess(profileId);
  const session = await getCounselorSession(profileId, sessionId);
  const reason = String(formData?.get("reason") || "").trim().slice(0, 800) || null;
  const studentCase = await ensureStudentCase(profileId);

  await prisma.$transaction([
    prisma.chatSession.update({
      where: { id: session.id },
      data: active
        ? {
            humanHandoffActive: true,
            assignedStaffUserId: current.user.id,
            handoffReason: reason,
            handoffStartedAt: new Date(),
          }
        : {
            humanHandoffActive: false,
            assignedStaffUserId: null,
            handoffReason: null,
            handoffStartedAt: null,
          },
    }),
    prisma.studentCase.update({
      where: { id: studentCase.id },
      data: {
        nextAction: active
          ? "A SOUP team member is handling one of your Counselor conversations."
          : "Continue with Noodles.",
      },
    }),
    prisma.notification.create({
      data: {
        profileId,
        type: "SYSTEM",
        title: active ? "SOUP team joined your conversation" : "AI Counselor resumed",
        body: active
          ? "A SOUP team member can now reply in this Counselor conversation. Your other Counselor threads remain available to the AI."
          : "The AI Counselor is available again in this conversation.",
        href: `/counselor?session=${encodeURIComponent(session.id)}`,
      },
    }),
  ]);

  revalidatePath(`/admin/users/${profileId}`);
  revalidatePath(`/admin/users/${profileId}/conversations/${session.id}`);
  revalidatePath("/dashboard");
}

export async function appendStaffCounselorReply(profileId: string, sessionId: string, formData: FormData) {
  const current = await assertCaseAccess(profileId);
  const content = String(formData.get("message") || "").trim().slice(0, 12_000);
  if (!content) throw new Error("Write a reply first.");

  const session = await getCounselorSession(profileId, sessionId);
  const updates = [];
  if (!session.humanHandoffActive) {
    updates.push(prisma.chatSession.update({
      where: { id: session.id },
      data: {
        humanHandoffActive: true,
        assignedStaffUserId: current.user.id,
        handoffReason: "Staff replied directly in this Counselor conversation.",
        handoffStartedAt: new Date(),
      },
    }));
  }

  updates.push(
    prisma.chatMessage.create({
      data: {
        sessionId,
        role: "ASSISTANT",
        content,
        metadata: {
          source: "HUMAN_STAFF",
          staffUserId: current.user.id,
          staffName: current.user.fullName,
          staffRole: current.user.role,
        },
      },
    }),
    prisma.chatSession.update({ where: { id: sessionId }, data: { lastSavedAt: new Date() } }),
    prisma.notification.create({
      data: { profileId, type: "SYSTEM", title: "Message from your SOUP team", body: content.slice(0, 220), href: `/counselor?session=${encodeURIComponent(sessionId)}` },
    }),
  );
  await prisma.$transaction(updates);

  revalidatePath(`/admin/users/${profileId}/conversations/${sessionId}`);
}
