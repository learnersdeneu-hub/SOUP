import { prisma } from "@/lib/prisma";
import { getApiStaff } from "@/lib/auth/apiStaff";
import { APPLICATION_OPERATIONS_ROLES } from "@/lib/auth/roles";
import { isSupersededChecklist } from "@/lib/journey/checklists";
import { parseJsonBody } from "@/lib/validation/http";
import { adminRequirementStatusSchema } from "@/lib/validation/schemas";
import type { ChecklistItemStatus, StudentApplicationStatus } from "@prisma/client";

const ALLOWED = new Set(["WAITING_FOR_DOCUMENT", "DOCUMENT_UPLOADED", "COMPLETE", "NOT_APPLICABLE", "BLOCKED", "ACTION_REQUIRED"]);

export async function POST(request: Request, { params }: { params: { id: string; itemId: string } }) {
  const staff = await getApiStaff(APPLICATION_OPERATIONS_ROLES);
  if (!staff) return Response.json({ error: "Admissions access required." }, { status: 403 });

  const parsed = await parseJsonBody(request, adminRequirementStatusSchema);
  if (!parsed.ok) return parsed.response;
  const { status, note } = parsed.data;
  if (!ALLOWED.has(status)) return Response.json({ error: "Unsupported requirement status." }, { status: 400 });

  const application = await prisma.studentApplication.findUnique({
    where: { id: params.id },
    include: { university: true },
  });
  if (!application) return Response.json({ error: "Application not found." }, { status: 404 });
  if (application.ownership !== "SOUP_MANAGED") return Response.json({ error: "SOUP cannot operate an external student-managed application." }, { status: 409 });

  const item = await prisma.journeyChecklistItem.findFirst({
    where: { id: params.itemId, checklist: { applicationId: application.id, kind: "ADMISSION" } },
    include: { checklist: { select: { sourceSnapshot: true } } },
  });
  if (!item) return Response.json({ error: "Application requirement not found." }, { status: 404 });
  if (isSupersededChecklist(item.checklist.sourceSnapshot)) return Response.json({ error: "This application checklist has been superseded. Review the current requirements instead." }, { status: 409 });
  if (status === "DOCUMENT_UPLOADED" && !item.documentId) return Response.json({ error: "No student document is linked to this requirement." }, { status: 409 });
  if (status === "COMPLETE" && (item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata) ? Boolean((item.metadata as Record<string, unknown>).requiresDocument) : false) && !item.documentId) return Response.json({ error: "Link the required student document before marking this requirement complete." }, { status: 409 });

  const existingMetadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
    ? item.metadata as Record<string, unknown>
    : {};
  let nextApplicationStatus = application.status;
  const ready = await prisma.$transaction(async (tx) => {
    await tx.journeyChecklistItem.update({
      where: { id: item.id },
      data: {
        status: status as ChecklistItemStatus,
        completedAt: status === "COMPLETE" || status === "NOT_APPLICABLE" ? new Date() : null,
        metadata: {
          ...existingMetadata,
          admissionsDecisionByUserId: staff.user.id,
          admissionsDecisionAt: new Date().toISOString(),
          admissionsNote: note || null,
          universityApproved: false,
        },
      },
    });

    const requiredItems = await tx.journeyChecklistItem.findMany({
      where: { checklistId: item.checklistId, required: true },
      select: { status: true },
    });
    const checklistReady = requiredItems.length > 0 && requiredItems.every((candidate) => candidate.status === "COMPLETE" || candidate.status === "NOT_APPLICABLE");
    // READY_TO_SUBMIT is reserved for explicit student approval. Staff checklist review must
    // never manufacture that approval state. A newly identified gap can, however, return an
    // already-approved file to DOCUMENTS_REQUIRED so the student sees that action is needed.
    if (application.status === "SHORTLISTED") nextApplicationStatus = "DOCUMENTS_REQUIRED";
    if (application.status === "READY_TO_SUBMIT" && !checklistReady) nextApplicationStatus = "DOCUMENTS_REQUIRED";
    if (nextApplicationStatus !== application.status) {
      await tx.studentApplication.update({ where: { id: application.id }, data: { status: nextApplicationStatus as StudentApplicationStatus } });
      await tx.studentApplicationEvent.create({
        data: {
          applicationId: application.id,
          actorUserId: staff.user.id,
          eventType: "STATUS_CHANGED",
          fromStatus: application.status,
          toStatus: nextApplicationStatus,
          message: nextApplicationStatus === "DOCUMENTS_REQUIRED"
            ? "Application returned to documents/actions required after admissions review."
            : `Application file moved to ${nextApplicationStatus.replaceAll("_", " ").toLowerCase()} after admissions checklist review.`,
          metadata: { checklistId: item.checklistId, automatic: true },
        },
      });
    }
    await tx.studentApplicationEvent.create({
      data: {
        applicationId: application.id,
        actorUserId: staff.user.id,
        eventType: "REQUIREMENT_REVIEWED",
        message: `${item.title} marked ${status.replaceAll("_", " ").toLowerCase()} for the SOUP application file.`,
        metadata: { checklistId: item.checklistId, checklistItemId: item.id, documentId: item.documentId, note: note || null, universityApproved: false },
      },
    });

    if (checklistReady && application.status === "DOCUMENTS_REQUIRED") {
      await tx.notification.create({
        data: {
          profileId: application.profileId,
          type: "SYSTEM",
          title: `${application.university?.name || "University"} application documents ready`,
          body: "SOUP admissions has completed its current checklist review. If your student-side information and actions are complete, review and approve the file for final submission checks.",
          href: `/applications/${application.id}`,
        },
      });
    }
    return checklistReady;
  });

  return Response.json({ itemId: item.id, status, applicationStatus: nextApplicationStatus, ready });
}
