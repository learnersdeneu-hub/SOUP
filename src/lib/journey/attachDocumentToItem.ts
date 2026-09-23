import { prisma } from "@/lib/prisma";
import type { ChecklistItemStatus } from "@prisma/client";

type ChecklistItemWithChecklist = {
  id: string;
  checklistId: string;
  title: string;
  required: boolean;
  status: ChecklistItemStatus;
  documentId: string | null;
  metadata: unknown;
  checklist: { applicationId: string | null };
};

// The actual "bind an uploaded document to the requirement it satisfies"
// logic — extracted from /api/journey/attach-document (the Noodles-driven
// attach flow) so a second, deterministic caller (a student uploading
// directly against a known requirement on the application page) can reuse
// the exact same effects instead of a parallel, possibly-diverging
// reimplementation: the checklist item's own status/documentId, the
// student_application_documents join row, the application's
// SHORTLISTED -> DOCUMENTS_REQUIRED bump, and the audit event. The Noodles
// route still owns its own ambiguity-resolution step (which open item does
// this document belong to?) before calling this — a direct per-requirement
// upload already knows the exact item, so it skips straight here.
export async function attachDocumentToChecklistItem({
  item,
  documentId,
  actorUserId,
  supplyMessage,
}: {
  item: ChecklistItemWithChecklist;
  documentId: string;
  actorUserId: string;
  supplyMessage: string;
}) {
  const linkageChanged = item.documentId !== documentId || item.status !== "DOCUMENT_UPLOADED";
  if (linkageChanged) {
    await prisma.journeyChecklistItem.update({
      where: { id: item.id },
      data: {
        documentId,
        status: "DOCUMENT_UPLOADED",
        metadata: {
          ...((item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)) ? item.metadata as Record<string, unknown> : {}),
          documentLinkedAt: new Date().toISOString(),
          authorityApproved: false,
          applicationRequirementSatisfiedByUpload: Boolean(item.checklist.applicationId),
        },
      },
    });
  }

  if (item.checklist.applicationId) {
    await prisma.studentApplicationDocument.upsert({
      where: { applicationId_documentId: { applicationId: item.checklist.applicationId, documentId } },
      create: { applicationId: item.checklist.applicationId, documentId, documentRole: item.title.slice(0, 300), required: item.required },
      update: { documentRole: item.title.slice(0, 300), required: item.required },
    });
    await prisma.studentApplication.updateMany({
      where: { id: item.checklist.applicationId, ownership: "SOUP_MANAGED", status: "SHORTLISTED" },
      data: { status: "DOCUMENTS_REQUIRED" },
    });
    if (linkageChanged) {
      await prisma.studentApplicationEvent.create({
        data: {
          applicationId: item.checklist.applicationId,
          actorUserId,
          eventType: "DOCUMENT_SUPPLIED",
          message: supplyMessage,
          metadata: { checklistId: item.checklistId, checklistItemId: item.id, documentId, universityApproved: false },
        },
      });
    }
  }

  const next = await prisma.journeyChecklistItem.findFirst({
    where: { checklistId: item.checklistId, status: { in: ["WAITING_FOR_DOCUMENT", "ACTION_REQUIRED", "NOT_STARTED"] } },
    orderBy: { position: "asc" },
  });
  const nextMetadata = next?.metadata && typeof next.metadata === "object" && !Array.isArray(next.metadata) ? next.metadata as Record<string, unknown> : {};

  return {
    checklistId: item.checklistId,
    itemId: item.id,
    status: "DOCUMENT_UPLOADED" as const,
    nextItem: next ? {
      id: next.id,
      title: next.title,
      status: next.status,
      requiresDocument: Boolean(nextMetadata.requiresDocument),
      externalActionUrl: next.externalActionUrl,
      externalActionLabel: next.externalActionLabel,
    } : null,
  };
}
