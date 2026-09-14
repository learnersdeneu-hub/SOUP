import { prisma } from "@/lib/prisma";
import { getApiStaff } from "@/lib/auth/apiStaff";
import { APPLICATION_OPERATIONS_ROLES } from "@/lib/auth/roles";
import { isSupersededChecklist } from "@/lib/journey/checklists";
import { sendTransactionalEmail, escapeHtml } from "@/lib/notifications/email";
import { shouldSendStudentEmail } from "@/lib/notifications/preferences";
import { parseJsonBody } from "@/lib/validation/http";
import { adminApplicationStatusSchema } from "@/lib/validation/schemas";
import type { Prisma, StudentApplicationStatus } from "@prisma/client";
import { canTransitionApplication, submissionGuardError } from "@/lib/applications/statusPolicy";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const staff = await getApiStaff(APPLICATION_OPERATIONS_ROLES);
  if (!staff) return Response.json({ error: "Staff access required." }, { status: 403 });
  const parsed = await parseJsonBody(request, adminApplicationStatusSchema);
  if (!parsed.ok) return parsed.response;
  const { status, externalReference, notes, submissionEvidenceUrl, submissionEvidenceNote } = parsed.data;
  const reference = externalReference || undefined;

  const application = await prisma.studentApplication.findUnique({ where: { id: params.id }, include: { profile: { include: { user: true } }, university: true, program: true } });
  if (!application) return Response.json({ error: "Application not found." }, { status: 404 });
  if (status === application.status) return Response.json({ id: application.id, status: application.status, unchanged: true });
  if (!canTransitionApplication(application.status, status as StudentApplicationStatus)) return Response.json({ error: `Invalid application transition from ${application.status.replaceAll("_", " ").toLowerCase()} to ${status.replaceAll("_", " ").toLowerCase()}.` }, { status: 409 });
  if (application.ownership !== "SOUP_MANAGED") return Response.json({ error: "SOUP staff cannot claim operational control over an external student-managed application." }, { status: 409 });


  let studentApprovalValid = true;
  if (["READY_TO_SUBMIT", "SUBMITTED"].includes(status)) {
    const [studentApproval, approvalInvalidation] = await Promise.all([
      prisma.studentApplicationEvent.findFirst({ where: { applicationId: application.id, eventType: "STUDENT_APPROVED_FOR_SUBMISSION" }, orderBy: { createdAt: "desc" }, select: { id: true, createdAt: true } }),
      prisma.studentApplicationEvent.findFirst({ where: { applicationId: application.id, eventType: "STUDENT_APPROVAL_INVALIDATED" }, orderBy: { createdAt: "desc" }, select: { id: true, createdAt: true } }),
    ]);
    studentApprovalValid = Boolean(studentApproval && (!approvalInvalidation || approvalInvalidation.createdAt <= studentApproval.createdAt));
    if (!studentApprovalValid && status === "READY_TO_SUBMIT") return Response.json({ error: "The student must review and approve the current application file before it can enter final submission or submitted status." }, { status: 409 });
  }

  if (status === "SUBMITTED") {
    const recentChecklists = await prisma.journeyChecklist.findMany({
      where: { applicationId: application.id, kind: "ADMISSION" },
      include: { items: { where: { required: true }, select: { status: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    const latestChecklist = recentChecklists.find((candidate) => !isSupersededChecklist(candidate.sourceSnapshot));
    const incomplete = latestChecklist ? latestChecklist.items.filter((item) => item.status !== "COMPLETE" && item.status !== "NOT_APPLICABLE").length : 0;
    const guardError = submissionGuardError({
      studentApprovalValid,
      eligibilityStatus: application.eligibilityStatus,
      applicationFeeStatus: application.applicationFeeStatus,
      deadlineAt: application.deadlineAt,
      externalReference: reference,
      hasSubmissionEvidence: Boolean(submissionEvidenceUrl || submissionEvidenceNote),
      hasCurrentChecklist: Boolean(latestChecklist),
      incompleteRequiredItems: incomplete,
    });
    if (guardError) return Response.json({ error: guardError }, { status: 409 });
  }
  if (["OFFER_RECEIVED", "CONDITIONAL_OFFER", "ENROLLED"].includes(status) && !application.offerDocumentId) {
    return Response.json({ error: "Upload the official offer letter through the SOUP offer workflow before recording an offer or enrolment status." }, { status: 409 });
  }

  const now = new Date();
  const data: Prisma.StudentApplicationUpdateInput = { status: status as StudentApplicationStatus, lastSoupActionAt: now, assignedStaffUserId: application.assignedStaffUserId || staff.user.id, ...(reference ? { externalReference: reference } : {}), ...(notes ? { notes } : {}) };
  if (status === "SUBMITTED") {
    if (!application.submittedAt) data.submittedAt = now;
    data.submissionEvidence = { reference, url: submissionEvidenceUrl || null, note: submissionEvidenceNote || null, recordedAt: now.toISOString(), recordedBy: staff.user.id };
  }
  if (status === "WITHDRAWN") { data.withdrawnAt = now; data.withdrawalReason = notes || "Withdrawn by SOUP staff."; }
  if (["OFFER_RECEIVED", "CONDITIONAL_OFFER", "REJECTED"].includes(status)) data.decisionAt = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const changed = await tx.studentApplication.update({ where: { id: application.id }, data });
    await tx.studentApplicationEvent.create({
      data: {
        applicationId: application.id,
        actorUserId: staff.user.id,
        eventType: "STATUS_CHANGED",
        fromStatus: application.status,
        toStatus: status,
        message: `SOUP staff changed the application status from ${application.status.replaceAll("_", " ").toLowerCase()} to ${status.replaceAll("_", " ").toLowerCase()}.`,
        metadata: { externalReference: reference || null, note: notes || null, submissionEvidenceUrl: submissionEvidenceUrl || null, submissionEvidenceNote: submissionEvidenceNote || null },
      },
    });
    if (["OFFER_RECEIVED", "CONDITIONAL_OFFER"].includes(status)) {
      await tx.studentCase.update({ where: { id: application.studentCaseId }, data: { stage: "OFFER_RECEIVED", nextAction: "Review your offer with Noodles and prepare the next visa, accommodation, insurance and pre-departure steps." } });
    }
    await tx.notification.create({
      data: {
        profileId: application.profileId,
        type: "SYSTEM",
        title: `${application.university?.name || "University"} application updated`,
        body: `Your application status is now ${status.replaceAll("_", " ").toLowerCase()}.`,
        href: "/applications",
      },
    });
    return changed;
  });
  if (shouldSendStudentEmail(application.profile, true)) await sendTransactionalEmail({
    to: application.profile.user.email,
    subject: `${application.university?.name || "University"} application update`,
    html: `<p>Hello ${escapeHtml(application.profile.user.fullName)},</p><p>Your application to <strong>${escapeHtml(application.university?.name || "your university")}</strong>${application.program?.title ? ` for ${escapeHtml(application.program.title)}` : ""} is now <strong>${escapeHtml(status.replaceAll("_", " ").toLowerCase())}</strong>.</p><p>Open My SOUP to see what is happening now and whether anything is waiting on you.</p>`,
    idempotencyKey: `application-status-${application.id}-${status}-${updated.updatedAt.toISOString()}`,
  }).catch(() => undefined);
  return Response.json({ id: updated.id, status: updated.status });
}
