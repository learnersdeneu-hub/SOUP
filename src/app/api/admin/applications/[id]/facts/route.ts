import { prisma } from "@/lib/prisma";
import { getApiStaff } from "@/lib/auth/apiStaff";
import { APPLICATION_OPERATIONS_ROLES } from "@/lib/auth/roles";
import { sendTransactionalEmail, escapeHtml } from "@/lib/notifications/email";
import { shouldSendStudentEmail } from "@/lib/notifications/preferences";
import { parseJsonBody } from "@/lib/validation/http";
import { adminApplicationFactsSchema } from "@/lib/validation/schemas";
import type { Prisma } from "@prisma/client";
import { getOrCreateInboundReplyToken, inboundReplyAddress, REPLY_NOTICE_HTML } from "@/lib/applications/inboundReply";
import { logServerError } from "@/lib/logging/safe";

const FEES = new Set(["UNKNOWN", "NOT_REQUIRED", "REQUIRED", "STUDENT_PAYING", "SOUP_PAYING", "PENDING", "PAID", "WAIVED", "REFUNDED"]);
const ELIGIBILITY = new Set(["NOT_CHECKED", "LIKELY_ELIGIBLE", "NEEDS_REVIEW", "NOT_ELIGIBLE"]);

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const staff = await getApiStaff(APPLICATION_OPERATIONS_ROLES);
  if (!staff) return Response.json({ error: "Admissions access required." }, { status: 403 });
  const parsed = await parseJsonBody(request, adminApplicationFactsSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const application = await prisma.studentApplication.findUnique({ where: { id: params.id }, include: { profile: { include: { user: true } }, university: true, program: true } });
  if (!application) return Response.json({ error: "Application not found." }, { status: 404 });
  if (application.ownership !== "SOUP_MANAGED") return Response.json({ error: "Only SOUP-managed applications can be operated here." }, { status: 409 });
  if (["SUBMITTED", "UNDER_REVIEW", "OFFER_RECEIVED", "CONDITIONAL_OFFER", "REJECTED", "WITHDRAWN", "ENROLLED"].includes(application.status)) {
    return Response.json({ error: "This operational snapshot is locked after university submission/decision. Record later changes through the appropriate event workflow." }, { status: 409 });
  }

  const data: Prisma.StudentApplicationUpdateInput = { lastSoupActionAt: new Date(), assignedStaffUserId: application.assignedStaffUserId || staff.user.id };
  if (body?.applicationFeeStatus !== undefined) {
    const value = body.applicationFeeStatus;
    if (!FEES.has(value)) return Response.json({ error: "Invalid fee status." }, { status: 400 });
    data.applicationFeeStatus = value;
  }
  if (body?.eligibilityStatus !== undefined) {
    const value = body.eligibilityStatus;
    if (!ELIGIBILITY.has(value)) return Response.json({ error: "Invalid eligibility status." }, { status: 400 });
    data.eligibilityStatus = value;
    data.eligibilityCheckedAt = new Date();
  }
  if (body?.applicationFeeAmount !== undefined) {
    const raw = String(body.applicationFeeAmount ?? "").trim();
    if (!raw) data.applicationFeeAmount = null;
    else { const amount = Number(raw); if (!Number.isFinite(amount) || amount < 0) return Response.json({ error: "Invalid application fee amount." }, { status: 400 }); data.applicationFeeAmount = amount; }
  }
  if (body?.applicationFeeCurrency !== undefined) {
    const currency = String(body.applicationFeeCurrency || "").trim().toUpperCase();
    data.applicationFeeCurrency = currency || null;
  }
  const reason = body.reason;
  if (Object.keys(data).length <= 2) return Response.json({ error: "No operational fact was supplied." }, { status: 400 });
  if (!reason) return Response.json({ error: "Add a short source/review note for this change." }, { status: 400 });

  const updated = await prisma.$transaction(async (tx) => {
    const changed = await tx.studentApplication.update({ where: { id: application.id }, data });
    await tx.studentApplicationEvent.create({
      data: {
        applicationId: application.id,
        actorUserId: staff.user.id,
        eventType: "APPLICATION_FACTS_REVIEWED",
        message: "SOUP admissions reviewed application eligibility/fee facts.",
        metadata: { reason, applicationFeeStatus: changed.applicationFeeStatus, applicationFeeAmount: changed.applicationFeeAmount?.toString() ?? null, applicationFeeCurrency: changed.applicationFeeCurrency, eligibilityStatus: changed.eligibilityStatus },
      },
    });
    return changed;
  });
  if (["REQUIRED", "STUDENT_PAYING", "SOUP_PAYING", "PENDING"].includes(updated.applicationFeeStatus)) {
    await prisma.notification.create({ data: { profileId: application.profileId, type: "PAYMENT", title: "University application fee requires attention", body: `${application.university?.name || "Your university"}${updated.applicationFeeAmount ? ` requires ${updated.applicationFeeCurrency || "USD"} ${updated.applicationFeeAmount}` : " has an application fee"}. This fee is separate from SOUP Premium.`, href: "/payments" } }).catch(() => undefined);
    if (shouldSendStudentEmail(application.profile, true)) {
      let replyTo: string | undefined;
      try { replyTo = inboundReplyAddress(await getOrCreateInboundReplyToken(application.id)); } catch (error) { logServerError("APPLICATION_FEE_REPLY_TOKEN_ERROR", error); }
      await sendTransactionalEmail({ to: application.profile.user.email, subject: `Application fee update — ${application.university?.name || "SOUP"}`, html: `<p>Hello ${escapeHtml(application.profile.user.fullName)},</p><p>An application fee has been recorded for <strong>${escapeHtml(application.university?.name || "your university")}</strong>${application.program?.title ? ` — ${escapeHtml(application.program.title)}` : ""}.</p><p>${updated.applicationFeeAmount ? `<strong>${escapeHtml(updated.applicationFeeCurrency || "USD")} ${escapeHtml(String(updated.applicationFeeAmount))}</strong>` : "The amount will be communicated through SOUP."}</p><p>This university fee is separate from SOUP Premium. Sign in to My SOUP → Payments to track it.</p>${REPLY_NOTICE_HTML}`, idempotencyKey: `application-fee-${application.id}-${updated.updatedAt.toISOString()}`, replyTo }).catch(() => undefined);
    }
  }
  return Response.json({ id: updated.id, applicationFeeStatus: updated.applicationFeeStatus, applicationFeeAmount: updated.applicationFeeAmount, applicationFeeCurrency: updated.applicationFeeCurrency, eligibilityStatus: updated.eligibilityStatus });
}
