import { prisma } from "@/lib/prisma";
import { isSupersededChecklist } from "@/lib/journey/checklists";
import { isStudentApprovalBlockingItem, missingCoreApplicationInformation } from "@/lib/applications/readiness";
import { documentIsSubmissionReady, requiresDocument } from "@/lib/applications/lifecycle";

export type ApproveResult =
  | { ok: true; status: "READY_TO_SUBMIT"; unchanged?: boolean }
  | { ok: false; error: string; status: number };

// The real, deterministic "is this application file actually ready"
// check — shared by the student-facing web approval
// (src/app/api/applications/[id]/approve/route.ts, session-authenticated)
// and the Companion run's own "Approve for submission" action
// (src/app/api/companion/applications/[id]/approve/route.ts, bearer-
// authenticated). Neither route duplicates this logic; both call it.
// Moves the application to READY_TO_SUBMIT in SOUP's own records — this
// is *not* the same as clicking submit on the university's own site,
// which remains the student's own action either way.
export async function approveApplicationForSubmission(profileId: string, userId: string, applicationId: string): Promise<ApproveResult> {
  const application = await prisma.studentApplication.findFirst({
    where: { id: applicationId, profileId },
    include: {
      university: { select: { name: true } },
      profile: { include: { user: true, studentCase: true } },
      checklists: { where: { kind: "ADMISSION" }, include: { items: { include: { document: { select: { reviewStatus: true, processingStatus: true, validUntil: true } } } } }, orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!application) return { ok: false, error: "Application not found.", status: 404 };
  if (application.ownership !== "SOUP_MANAGED") return { ok: false, error: "Only SOUP-managed applications can be approved for SOUP submission.", status: 409 };
  if (!["DOCUMENTS_REQUIRED", "READY_TO_SUBMIT"].includes(application.status)) return { ok: false, error: "This application is not currently waiting for student file approval.", status: 409 };

  const checklist = application.checklists.find((candidate) => !isSupersededChecklist(candidate.sourceSnapshot));
  if (!checklist) return { ok: false, error: "Prepare the application requirements checklist first.", status: 409 };
  const missingCore = missingCoreApplicationInformation({
    fullName: application.profile.user.fullName,
    email: application.profile.user.email,
    dateOfBirth: application.profile.user.dateOfBirth,
    nationality: application.profile.user.nationality,
    currentCountry: application.profile.user.currentCountry,
    academicBackgroundSummary: application.profile.studentCase?.academicBackgroundSummary,
  });
  if (missingCore.length) return { ok: false, error: `Complete your application information first: ${missingCore.join(", ")}.`, status: 409 };

  const missing = checklist.items.filter((item) => isStudentApprovalBlockingItem(item) && !["DOCUMENT_UPLOADED", "COMPLETE", "NOT_APPLICABLE"].includes(item.status));
  if (missing.length) return { ok: false, error: `Your file still has ${missing.length} student action${missing.length === 1 ? "" : "s"} outstanding.`, status: 409 };
  const unreviewedDocuments = checklist.items.filter((item) => isStudentApprovalBlockingItem(item) && requiresDocument(item) && !documentIsSubmissionReady(item));
  if (unreviewedDocuments.length) return { ok: false, error: `${unreviewedDocuments.length} required document${unreviewedDocuments.length === 1 ? " is" : "s are"} still processing, awaiting SOUP review, expired, or need replacement.`, status: 409 };
  if (application.status === "READY_TO_SUBMIT" && application.studentApprovedAt) return { ok: true, status: "READY_TO_SUBMIT", unchanged: true };
  if (application.eligibilityStatus === "NOT_ELIGIBLE") return { ok: false, error: "This application is marked not eligible and cannot be approved for submission.", status: 409 };

  const approvedAt = new Date();
  await prisma.$transaction([
    prisma.studentApplication.update({ where: { id: application.id }, data: { status: "READY_TO_SUBMIT", studentDeclarationAt: approvedAt, studentApprovedAt: approvedAt, lastStudentActionAt: approvedAt } }),
    prisma.studentApplicationEvent.create({ data: { applicationId: application.id, actorUserId: userId, eventType: "STUDENT_APPROVED_FOR_SUBMISSION", fromStatus: application.status, toStatus: "READY_TO_SUBMIT", message: `Student reviewed, confirmed the accuracy declaration, and approved the ${application.university?.name || "university"} application file for SOUP submission.`, metadata: { declarationAccepted: true, declarationAt: approvedAt.toISOString() } } }),
    prisma.studentCase.update({ where: { id: application.studentCaseId }, data: { stage: "APPLYING", nextAction: `SOUP is completing final submission checks for ${application.university?.name || "your university application"}. No student action is required unless SOUP requests an update.` } }),
    prisma.notification.create({ data: { profileId, type: "SYSTEM", title: "Application file approved", body: `${application.university?.name || "Your university"} is ready for final SOUP submission checks.`, href: `/applications/${application.id}` } }),
  ]);

  return { ok: true, status: "READY_TO_SUBMIT" };
}
