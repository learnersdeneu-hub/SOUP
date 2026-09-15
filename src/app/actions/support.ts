"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, requireProfile, requireRole } from "@/lib/auth/currentUser";
import { CASE_ROLES, SUPPORT_ROLES } from "@/lib/auth/roles";
import { escapeHtml, sendTransactionalEmail } from "@/lib/notifications/email";
import { shouldSendStudentEmail } from "@/lib/notifications/preferences";
import { logServerError } from "@/lib/logging/safe";
import { SOUP_SUPPORT_EMAIL } from "@/lib/support/config";

export async function createSupportTicket(formData: FormData) {
  const { user, profile } = await requireProfile();
  const subject = String(formData.get("subject") || "").trim();
  const category = String(formData.get("category") || "GENERAL").trim();
  const body = String(formData.get("body") || "").trim();

  if (subject.length < 3 || body.length < 10) {
    throw new Error("Please provide a subject and enough detail for support to help.");
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      profileId: profile.id,
      customerUserId: user.id,
      subject,
      category,
      messages: { create: { authorId: user.id, body } },
    },
  });

  await prisma.notification.create({
    data: {
      profileId: profile.id,
      type: "SUPPORT",
      title: "Support request received",
      body: `Your support request \"${subject}\" has been opened.`,
      href: "/support",
    },
  });

  const staffProfiles = await prisma.profile.findMany({
    where: { user: { role: { in: ["ADMIN", "SUPER_ADMIN", "SUPPORT"] }, accountStatus: "ACTIVE" } },
    select: { id: true },
  });
  if (staffProfiles.length) {
    await prisma.notification.createMany({
      data: staffProfiles.map((staffProfile) => ({
        profileId: staffProfile.id,
        type: "SUPPORT" as const,
        title: "New support request",
        body: `${user.fullName} opened: ${subject}`,
        href: "/admin/support",
      })),
    });
  }

  await sendTransactionalEmail({
    to: SOUP_SUPPORT_EMAIL,
    subject: `[SOUP Support] ${subject}`,
    html: `<h2>New SOUP support request</h2><p><strong>Student:</strong> ${escapeHtml(user.fullName)} (${escapeHtml(user.email)})</p><p><strong>Category:</strong> ${escapeHtml(category)}</p><p><strong>Subject:</strong> ${escapeHtml(subject)}</p><p>${escapeHtml(body).replace(/\n/g, "<br/>")}</p><p><a href="${escapeHtml(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001")}/admin/support">Open the support queue</a></p>`,
    idempotencyKey: `support-ticket-${ticket.id}`,
  });

  revalidatePath("/support");
  revalidatePath("/dashboard");
  revalidatePath("/admin/support");
}

export async function replyToSupportTicket(ticketId: string, formData: FormData) {
  const current = await requireCurrentUser();
  const body = String(formData.get("body") || "").trim();
  if (!body) throw new Error("Reply cannot be empty.");

  const ticket = await prisma.supportTicket.findUniqueOrThrow({
    where: { id: ticketId },
    include: { profile: true },
  });

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(current.user.role);
  const isSupport = current.user.role === "SUPPORT";
  const isStaff = isAdmin || isSupport;
  const isOwner = ticket.customerUserId === current.user.id;
  const supportCanAccess = isSupport && (ticket.assignedToUserId === current.user.id || ticket.assignedToUserId === null);
  if (!isOwner && !isAdmin && !supportCanAccess) throw new Error("You do not have access to this support request.");

  await prisma.supportTicketMessage.create({
    data: { ticketId, authorId: current.user.id, body },
  });

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: isStaff ? "WAITING_FOR_CUSTOMER" : "OPEN" },
  });

  if (isStaff) {
    await prisma.notification.create({
      data: {
        profileId: ticket.profileId,
        type: "SUPPORT",
        title: "Support replied",
        body: "There is a new reply on your support request.",
        href: "/support",
      },
    });
  } else {
    await sendTransactionalEmail({
      to: SOUP_SUPPORT_EMAIL,
      subject: `[SOUP Support Reply] ${ticket.subject}`,
      html: `<h2>Student replied to a support request</h2><p><strong>Student:</strong> ${escapeHtml(current.user.fullName)} (${escapeHtml(current.user.email)})</p><p><strong>Ticket:</strong> ${escapeHtml(ticket.subject)}</p><p>${escapeHtml(body).replace(/\n/g, "<br/>")}</p>`,
      idempotencyKey: `support-reply-${ticketId}-${Date.now()}`,
    });
  }

  revalidatePath("/support");
  revalidatePath("/admin/support");
}

export async function updateSupportTicketStatus(ticketId: string, status: "OPEN" | "IN_PROGRESS" | "WAITING_FOR_CUSTOMER" | "RESOLVED" | "CLOSED") {
  const current = await requireRole(SUPPORT_ROLES);
  const ticket = await prisma.supportTicket.findUniqueOrThrow({ where: { id: ticketId } });
  if (current.user.role === "SUPPORT" && ticket.assignedToUserId !== current.user.id) {
    throw new Error("Assign this ticket to yourself before changing its status.");
  }
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status, closedAt: status === "CLOSED" ? new Date() : null },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/support");
}

export async function assignSupportTicket(ticketId: string, assigneeUserId: string | null) {
  const current = await requireRole(SUPPORT_ROLES);
  const ticket = await prisma.supportTicket.findUniqueOrThrow({ where: { id: ticketId } });
  if (current.user.role === "SUPPORT") {
    if (ticket.assignedToUserId && ticket.assignedToUserId !== current.user.id) {
      throw new Error("This ticket is already assigned to another support user.");
    }
    if (assigneeUserId !== current.user.id) {
      throw new Error("Support users can only assign an unassigned ticket to themselves.");
    }
  }
  if (assigneeUserId) {
    const assignee = await prisma.user.findUniqueOrThrow({ where: { id: assigneeUserId } });
    if (!["ADMIN", "SUPER_ADMIN", "SUPPORT"].includes(assignee.role)) throw new Error("Tickets can only be assigned to staff.");
  }
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { assignedToUserId: assigneeUserId, status: "IN_PROGRESS" },
  });
  revalidatePath("/admin/support");
}

export async function addInternalSupportNote(ticketId: string, formData: FormData) {
  const current = await requireRole(SUPPORT_ROLES);
  const body = String(formData.get("body") || "").trim();
  if (!body) throw new Error("Internal note cannot be empty.");
  const ticket = await prisma.supportTicket.findUniqueOrThrow({ where: { id: ticketId } });
  if (current.user.role === "SUPPORT" && ticket.assignedToUserId !== current.user.id) {
    throw new Error("Assign this ticket to yourself before adding internal notes.");
  }
  await prisma.supportTicketMessage.create({
    data: { ticketId, authorId: current.user.id, body, isInternal: true },
  });
  revalidatePath("/admin/support");
}

export async function addInternalUserNote(profileId: string, formData: FormData) {
  const current = await requireRole(CASE_ROLES);
  const body = String(formData.get("body") || "").trim();
  if (body.length < 3) throw new Error("Internal note is too short.");
  await prisma.profile.findUniqueOrThrow({ where: { id: profileId } });
  if (current.user.role === "SUPPORT") {
    const assigned = await prisma.supportTicket.findFirst({
      where: { profileId, assignedToUserId: current.user.id },
      select: { id: true },
    });
    if (!assigned) throw new Error("This customer is not assigned to your support queue.");
  }
  await prisma.internalUserNote.create({
    data: { profileId, authoredById: current.user.id, body },
  });
  revalidatePath(`/admin/users`);
  revalidatePath(`/admin/users/${profileId}`);
}

// Staff-facing "Add alert": a short, student-visible message shown on the
// student's dashboard, distinct from addInternalUserNote which is staff-only
// and must never reach the student.
export async function addStudentAlert(profileId: string, formData: FormData) {
  const current = await requireRole(CASE_ROLES);
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (title.length < 3 || body.length < 3) throw new Error("Provide a short title and message for the student alert.");
  const profile = await prisma.profile.findUniqueOrThrow({ where: { id: profileId }, include: { user: true } });
  if (current.user.role === "SUPPORT") {
    const assigned = await prisma.supportTicket.findFirst({ where: { profileId, assignedToUserId: current.user.id }, select: { id: true } });
    if (!assigned) throw new Error("This customer is not assigned to your support queue.");
  }
  await prisma.notification.create({
    data: { profileId, type: "SYSTEM", title: title.slice(0, 200), body: body.slice(0, 2000), href: "/dashboard" },
  });
  if (shouldSendStudentEmail(profile, true)) await sendTransactionalEmail({
    to: profile.user.email,
    subject: title.slice(0, 200),
    html: `<p>Hello ${escapeHtml(profile.user.fullName)},</p><p>${escapeHtml(body).replace(/\n/g, "<br/>")}</p>`,
    idempotencyKey: `student-alert-${profileId}-${Date.now()}`,
  }).catch((error) => logServerError("SOUP_STUDENT_ALERT_EMAIL_ERROR", error));
  revalidatePath(`/admin/users/${profileId}`);
  revalidatePath("/dashboard");
}

export async function requestHumanCounselor(formData?: FormData) {
  const { user, profile } = await requireProfile();
  const reason = String(formData?.get("reason") || "I would like a human counselor to review my case.").trim().slice(0, 1200);
  const studentCase = await prisma.studentCase.findUnique({ where: { profileId: profile.id } });
  if (!studentCase) throw new Error("Start your SOUP counselor profile first so we can attach the request to your case.");

  const existing = await prisma.supportTicket.findFirst({
    where: { profileId: profile.id, category: "COUNSELOR_HANDOFF", status: { in: ["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"] } },
    orderBy: { updatedAt: "desc" },
  });
  const ticket = existing || await prisma.supportTicket.create({
    data: {
      profileId: profile.id,
      customerUserId: user.id,
      subject: "Human counselor requested",
      category: "COUNSELOR_HANDOFF",
      priority: "HIGH",
      messages: { create: { authorId: user.id, body: reason || "I would like a human counselor to review my case." } },
    },
  });

  await prisma.studentCase.update({
    where: { id: studentCase.id },
    data: { humanHandoffActive: true, handoffReason: reason || "Student requested a human counselor.", handoffStartedAt: new Date(), nextAction: "A SOUP counselor has been requested. Continue with Noodles while the team reviews your case." },
  });

  const staffProfiles = await prisma.profile.findMany({
    where: { user: { role: { in: ["COUNSELOR", "ADMISSIONS", "ADMIN", "SUPER_ADMIN", "SUPPORT"] }, accountStatus: "ACTIVE" } },
    select: { id: true },
  });
  if (staffProfiles.length) await prisma.notification.createMany({ data: staffProfiles.map((p)=>({ profileId:p.id, type:"SUPPORT" as const, title:"Human counselor requested", body:`${user.fullName} requested counselor review.`, href:"/admin/support" })) });
  await prisma.notification.create({ data: { profileId: profile.id, type: "SUPPORT", title: "Counselor request received", body: "The SOUP team has been alerted. Your Noodles remains available while a human counselor reviews the request.", href: "/support" } });

  await sendTransactionalEmail({
    to: SOUP_SUPPORT_EMAIL,
    subject: `[SOUP Counselor Request] ${user.fullName}`,
    html: `<h2>Human counselor requested</h2><p><strong>Student:</strong> ${escapeHtml(user.fullName)} (${escapeHtml(user.email)})</p><p>${escapeHtml(reason || "Human counselor requested.")}</p>`,
    idempotencyKey: `counselor-handoff-${ticket.id}`,
  }).catch((error)=>logServerError("SOUP_COUNSELOR_HANDOFF_EMAIL_ERROR", error));

  revalidatePath("/support");
  revalidatePath("/dashboard");
  revalidatePath("/admin/support");
}
