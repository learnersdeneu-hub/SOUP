import { prisma } from "@/lib/prisma";
import { isSupersededChecklist } from "@/lib/journey/checklists";
import { requireApiProfile } from "@/lib/auth/apiUser";
import { parseJsonBody } from "@/lib/validation/http";
import { attachJourneyDocumentSchema } from "@/lib/validation/schemas";
import { selectAttachmentCandidate } from "@/lib/journey/attachmentMatching";

export async function POST(request: Request) {
  const current = await requireApiProfile();
  if (!current.ok) return current.response;
  const { authUser: user, profile } = current;
  const parsed = await parseJsonBody(request, attachJourneyDocumentSchema);
  if (!parsed.ok) return parsed.response;
  const { documentId, checklistItemId, applicationId } = parsed.data;
  const requestedLabel = parsed.data.requestedLabel;
  const requestedApplicationId = applicationId;

  const document = await prisma.document.findFirst({ where: { id: documentId, profileId: profile.id } });
  if (!document) return Response.json({ error: "Document not found." }, { status: 404 });

  const explicitItem = checklistItemId
    ? await prisma.journeyChecklistItem.findFirst({
        where: {
          id: checklistItemId,
          checklist: { profileId: profile.id, ...(requestedApplicationId ? { applicationId: requestedApplicationId } : {}) },
          status: { in: ["WAITING_FOR_DOCUMENT", "ACTION_REQUIRED", "NOT_STARTED", "DOCUMENT_UPLOADED"] },
        },
        include: { checklist: true },
      })
    : null;

  const openItems = checklistItemId ? [] : await prisma.journeyChecklistItem.findMany({
    where: {
      checklist: { profileId: profile.id },
      status: { in: ["WAITING_FOR_DOCUMENT", "ACTION_REQUIRED", "NOT_STARTED", "DOCUMENT_UPLOADED"] },
    },
    include: { checklist: true },
    orderBy: [{ checklist: { updatedAt: "desc" } }, { position: "asc" }],
    take: 200,
  });

  const candidates = [
    ...(explicitItem ? [explicitItem] : []),
    ...openItems,
  ].map((candidate) => ({
    id: candidate.id,
    title: candidate.title,
    applicationId: candidate.checklist.applicationId,
    superseded: isSupersededChecklist(candidate.checklist.sourceSnapshot),
  }));
  const selection = selectAttachmentCandidate({
    candidates,
    checklistItemId,
    requestedLabel,
    applicationId: requestedApplicationId,
  });
  if (selection.kind === "ambiguous") {
    return Response.json({
      attached: false,
      ambiguous: true,
      message: "The document is saved in your vault, but more than one open requirement has a similar name. Open the specific application/checklist so SOUP can bind it to the correct item.",
    });
  }
  const item = selection.kind === "match"
    ? (explicitItem?.id === selection.itemId ? explicitItem : openItems.find((candidate) => candidate.id === selection.itemId) ?? null)
    : null;
  if (!item) return Response.json({ attached: false });

  const linkageChanged = item.documentId !== document.id || item.status !== "DOCUMENT_UPLOADED";
  if (linkageChanged) {
    await prisma.journeyChecklistItem.update({
      where: { id: item.id },
      data: {
        documentId: document.id,
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
      where: { applicationId_documentId: { applicationId: item.checklist.applicationId, documentId: document.id } },
      create: {
        applicationId: item.checklist.applicationId,
        documentId: document.id,
        documentRole: item.title.slice(0, 300),
        required: item.required,
      },
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
          actorUserId: user.id,
          eventType: "DOCUMENT_SUPPLIED",
          message: `${item.title} was supplied through Noodles for this application.`,
          metadata: { checklistId: item.checklistId, checklistItemId: item.id, documentId: document.id, universityApproved: false },
        },
      });
    }
  }

  const next = await prisma.journeyChecklistItem.findFirst({
    where: { checklistId: item.checklistId, status: { in: ["WAITING_FOR_DOCUMENT", "ACTION_REQUIRED", "NOT_STARTED"] } },
    orderBy: { position: "asc" },
  });

  const nextMetadata = next?.metadata && typeof next.metadata === "object" && !Array.isArray(next.metadata)
    ? next.metadata as Record<string, unknown>
    : {};
  return Response.json({
    attached: true,
    checklistId: item.checklistId,
    itemId: item.id,
    status: "DOCUMENT_UPLOADED",
    nextItem: next ? {
      id: next.id,
      title: next.title,
      status: next.status,
      requiresDocument: Boolean(nextMetadata.requiresDocument),
      externalActionUrl: next.externalActionUrl,
      externalActionLabel: next.externalActionLabel,
    } : null,
  });
}
