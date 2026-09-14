"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProfile, requireRole } from "@/lib/auth/currentUser";
import { CASE_ROLES } from "@/lib/auth/roles";
import { sendTransactionalEmail, escapeHtml } from "@/lib/notifications/email";
import { SOUP_SUPPORT_EMAIL } from "@/lib/support/config";

function clean(value: FormDataEntryValue | null, max = 500) {
  return String(value || "").trim().slice(0, max);
}

export async function requestCounselorSession(formData: FormData) {
  const { user, profile } = await requireProfile();
  const payment = await prisma.payment.findFirst({
    where: { profileId: profile.id, type: "PREMIUM_COUNSELING", status: "PAID", OR: [{ title: "SOUP Concierge" }, { metadata: { path: ["plan"], equals: "premium_plus" } }] },
  });
  if (!payment) throw new Error("Counselor video-session booking is included with SOUP Concierge.");
  const dateText = clean(formData.get("requestedDate"), 30);
  const requestedDate = dateText ? new Date(`${dateText}T12:00:00`) : null;
  if (requestedDate && Number.isNaN(requestedDate.getTime())) throw new Error("Choose a valid preferred date.");
  const timeNote = clean(formData.get("requestedTimeNote"), 120);
  const studentNote = clean(formData.get("studentNote"), 1000);
  const existing = await prisma.counselorSession.findFirst({ where: { profileId: profile.id, status: { in: ["REQUESTED", "SCHEDULED"] } }, orderBy: { createdAt: "desc" } });
  if (existing) throw new Error("You already have an active counselor-session request or scheduled session.");

  const session = await prisma.counselorSession.create({ data: { profileId: profile.id, requestedByUserId: user.id, requestedDate, requestedTimeNote: timeNote || null, studentNote: studentNote || null } });
  await prisma.notification.create({ data: { profileId: profile.id, type: "SYSTEM", title: "Counselor session requested", body: "SOUP Concierge received your preferred time. The confirmed session and meeting link will appear in My SOUP.", href: "/sessions" } });
  const staffProfiles = await prisma.profile.findMany({ where: { user: { role: { in: ["COUNSELOR", "ADMISSIONS", "ADMIN", "SUPER_ADMIN"] }, accountStatus: "ACTIVE" } }, select: { id: true } });
  if (staffProfiles.length) await prisma.notification.createMany({ data: staffProfiles.map((p)=>({ profileId:p.id, type:"SYSTEM" as const, title:"Concierge session requested", body:`${user.fullName} requested a counselor session.`, href:"/admin/sessions" })) });
  await sendTransactionalEmail({ to: SOUP_SUPPORT_EMAIL, subject: `[SOUP Concierge] Session requested — ${user.fullName}`, html: `<p><strong>${escapeHtml(user.fullName)}</strong> requested a counselor session.</p><p>Preferred date: ${escapeHtml(dateText || "Flexible")}</p><p>Preferred time: ${escapeHtml(timeNote || "Flexible")}</p><p>${escapeHtml(studentNote || "")}</p>`, idempotencyKey: `concierge-session-${session.id}` }).catch(()=>undefined);
  revalidatePath("/sessions"); revalidatePath("/dashboard"); revalidatePath("/admin/sessions");
}

export async function scheduleCounselorSession(sessionId: string, formData: FormData) {
  const staff = await requireRole(CASE_ROLES);
  const scheduledText = clean(formData.get("scheduledFor"), 60);
  const meetingUrl = clean(formData.get("meetingUrl"), 1000);
  const staffNote = clean(formData.get("staffNote"), 1000);
  const scheduledFor = new Date(scheduledText);
  if (!scheduledText || Number.isNaN(scheduledFor.getTime())) throw new Error("Choose a valid session date and time.");
  if (meetingUrl && !/^https:\/\//i.test(meetingUrl)) throw new Error("Meeting links must use HTTPS.");
  const session = await prisma.counselorSession.update({ where: { id: sessionId }, data: { counselorUserId: staff.user.id, scheduledFor, meetingUrl: meetingUrl || null, staffNote: staffNote || null, status: "SCHEDULED" }, include: { profile: true } });
  await prisma.notification.create({ data: { profileId: session.profileId, type: "SYSTEM", title: "Counselor session confirmed", body: `Your SOUP Concierge session is scheduled for ${scheduledFor.toLocaleString()}.`, href: "/sessions" } });
  revalidatePath("/sessions"); revalidatePath("/admin/sessions"); revalidatePath("/dashboard");
}

export async function updateCounselorSessionStatus(sessionId: string, status: "COMPLETED"|"CANCELLED"|"NO_SHOW") {
  const staff = await requireRole(CASE_ROLES);
  const session = await prisma.counselorSession.findUniqueOrThrow({ where: { id: sessionId } });
  if (staff.user.role === "COUNSELOR" && session.counselorUserId && session.counselorUserId !== staff.user.id) throw new Error("This session is assigned to another counselor.");
  await prisma.counselorSession.update({ where: { id: sessionId }, data: { status } });
  revalidatePath("/sessions"); revalidatePath("/admin/sessions");
}
