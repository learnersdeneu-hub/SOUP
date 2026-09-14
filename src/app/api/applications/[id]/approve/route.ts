import { prisma } from "@/lib/prisma";
import { isSupersededChecklist } from "@/lib/journey/checklists";
import { isStudentApprovalBlockingItem, missingCoreApplicationInformation } from "@/lib/applications/readiness";
import { documentIsSubmissionReady, requiresDocument } from "@/lib/applications/lifecycle";
import { requireApiProfile } from "@/lib/auth/apiUser";
import { parseJsonBody } from "@/lib/validation/http";
import { applicationApproveSchema } from "@/lib/validation/schemas";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const current = await requireApiProfile();
  if (!current.ok) return current.response;
  const { authUser: user, profile } = current;
  const parsed = await parseJsonBody(request, applicationApproveSchema);
  if (!parsed.ok) return parsed.response;
  if (!parsed.data.declarationAccepted) return Response.json({ error: "Confirm the accuracy declaration before approving the application." }, { status: 400 });

  const application = await prisma.studentApplication.findFirst({
    where: { id: params.id, profileId: profile.id },
    include: { university: { select: { name: true } }, profile: { include: { user: true, studentCase: true } }, checklists: { where: { kind: "ADMISSION" }, include: { items: { include: { document: { select: { reviewStatus: true, processingStatus: true, validUntil: true } } } } }, orderBy: { createdAt: "desc" }, take: 10 } },
  });
  if (!application) return Response.json({ error: "Application not found." }, { status: 404 });
  if (application.ownership !== "SOUP_MANAGED") return Response.json({ error: "Only SOUP-managed applications can be approved for SOUP submission." }, { status: 409 });
  if (!["DOCUMENTS_REQUIRED", "READY_TO_SUBMIT"].includes(application.status)) return Response.json({ error: "This application is not currently waiting for student file approval." }, { status: 409 });

  const checklist = application.checklists.find((candidate) => !isSupersededChecklist(candidate.sourceSnapshot));
  if (!checklist) return Response.json({ error: "Prepare the application requirements checklist first." }, { status: 409 });
  const missingCore = missingCoreApplicationInformation({
    fullName: application.profile.user.fullName,
    email: application.profile.user.email,
    dateOfBirth: application.profile.user.dateOfBirth,
    nationality: application.profile.user.nationality,
    currentCountry: application.profile.user.currentCountry,
    academicBackgroundSummary: application.profile.studentCase?.academicBackgroundSummary,
  });
  if (missingCore.length) return Response.json({ error: `Complete your application information first: ${missingCore.join(", ")}.` }, { status: 409 });

  const missing = checklist.items.filter((item) => isStudentApprovalBlockingItem(item) && !["DOCUMENT_UPLOADED", "COMPLETE", "NOT_APPLICABLE"].includes(item.status));
  if (missing.length) return Response.json({ error: `Your file still has ${missing.length} student action${missing.length === 1 ? "" : "s"} outstanding.` }, { status: 409 });
  const unreviewedDocuments = checklist.items.filter((item) => isStudentApprovalBlockingItem(item) && requiresDocument(item) && !documentIsSubmissionReady(item));
  if (unreviewedDocuments.length) return Response.json({ error: `${unreviewedDocuments.length} required document${unreviewedDocuments.length === 1 ? " is" : "s are"} still processing, awaiting SOUP review, expired, or need replacement.` }, { status: 409 });
  if (application.status === "READY_TO_SUBMIT" && application.studentApprovedAt) return Response.json({ ok: true, status: "READY_TO_SUBMIT", unchanged: true });
  if (application.eligibilityStatus === "NOT_ELIGIBLE") return Response.json({ error: "This application is marked not eligible and cannot be approved for submission." }, { status: 409 });

  const approvedAt = new Date();
  await prisma.$transaction([
    prisma.studentApplication.update({ where: { id: application.id }, data: { status: "READY_TO_SUBMIT", studentDeclarationAt: approvedAt, studentApprovedAt: approvedAt, lastStudentActionAt: approvedAt } }),
    prisma.studentApplicationEvent.create({ data: { applicationId: application.id, actorUserId: user.id, eventType: "STUDENT_APPROVED_FOR_SUBMISSION", fromStatus: application.status, toStatus: "READY_TO_SUBMIT", message: `Student reviewed, confirmed the accuracy declaration, and approved the ${application.university?.name || "university"} application file for SOUP submission.`, metadata: { declarationAccepted: true, declarationAt: approvedAt.toISOString() } } }),
    prisma.studentCase.update({ where: { id: application.studentCaseId }, data: { stage: "APPLYING", nextAction: `SOUP is completing final submission checks for ${application.university?.name || "your university application"}. No student action is required unless SOUP requests an update.` } }),
    prisma.notification.create({ data: { profileId: profile.id, type: "SYSTEM", title: "Application file approved", body: `${application.university?.name || "Your university"} is ready for final SOUP submission checks.`, href: `/applications/${application.id}` } }),
  ]);

  return Response.json({ ok: true, status: "READY_TO_SUBMIT" });
}
