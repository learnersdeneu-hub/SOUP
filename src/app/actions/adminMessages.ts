"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/currentUser";
import { APPLICATION_OPERATIONS_ROLES } from "@/lib/auth/roles";
import { sendTransactionalEmail, escapeHtml } from "@/lib/notifications/email";
import { getOrCreateInboundReplyToken, inboundReplyAddress } from "@/lib/applications/inboundReply";
import { logServerError } from "@/lib/logging/safe";

// Lets staff reply to a student directly from the application's "Email
// communication" section instead of having to leave SOUP and reply from
// their own mail client (which would never get logged here at all). The
// reply's replyTo is still the application's own inbound address, so if
// the student replies again, it keeps landing in the same place — this
// isn't a one-off email, it's a real turn in the same thread the inbound
// webhook already writes to.
export async function sendApplicationReply(applicationId: string, formData: FormData) {
  const staff = await requireRole(APPLICATION_OPERATIONS_ROLES);
  const body = String(formData.get("body") || "").trim();
  if (!body) throw new Error("Write a message before sending.");
  if (body.length > 20000) throw new Error("Message is too long.");

  const application = await prisma.studentApplication.findUniqueOrThrow({
    where: { id: applicationId },
    include: { profile: { include: { user: true } }, university: true },
  });

  const lastInbound = await prisma.applicationMessage.findFirst({
    where: { applicationId, direction: "INBOUND", messageId: { not: null } },
    orderBy: { receivedAt: "desc" },
    select: { messageId: true, subject: true },
  });

  const replyTo = inboundReplyAddress(await getOrCreateInboundReplyToken(applicationId));
  const subject = lastInbound?.subject
    ? (lastInbound.subject.toLowerCase().startsWith("re:") ? lastInbound.subject : `Re: ${lastInbound.subject}`)
    : `${application.university?.name || "Your application"} — message from SOUP`;
  const html = `<p>${escapeHtml(body).replace(/\n/g, "<br>")}</p>`;

  const extraHeaders: Record<string, string> = {};
  if (lastInbound?.messageId) {
    extraHeaders["In-Reply-To"] = lastInbound.messageId;
    extraHeaders["References"] = lastInbound.messageId;
  }

  const result = await sendTransactionalEmail({
    to: application.profile.user.email,
    subject,
    html,
    replyTo,
    extraHeaders,
    idempotencyKey: `application-reply-${applicationId}-${Date.now()}`,
  });
  if (!result.sent) throw new Error("SOUP could not send that reply right now. Please try again.");

  // Resend's send-response id is used the same way the inbound webhook
  // uses email_id: as the unique key that makes this row safe to write
  // once and identifiable later, not as a real RFC Message-ID (Resend's
  // send API doesn't return one) — fine here since nothing threads off an
  // OUTBOUND row's own messageId today, only off INBOUND ones.
  if (result.id) {
    await prisma.applicationMessage.create({
      data: {
        applicationId,
        direction: "OUTBOUND",
        sentByUserId: staff.user.id,
        providerEventId: result.id,
        fromAddress: process.env.SOUP_EMAIL_FROM || "SOUP",
        toAddresses: [application.profile.user.email],
        subject,
        htmlBody: html,
        textBody: body,
        receivedAt: new Date(),
      },
    }).catch((error) => logServerError("SOUP_APPLICATION_REPLY_SAVE_ERROR", error));
  }

  await prisma.notification.create({
    data: {
      profileId: application.profileId,
      type: "MESSAGE",
      title: "New message from SOUP",
      body: subject,
      href: "/applications",
    },
  }).catch((error) => logServerError("SOUP_APPLICATION_REPLY_NOTIFICATION_ERROR", error));

  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/admin/messages");
  revalidatePath(`/applications/${applicationId}`);
}
