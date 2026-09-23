import { prisma } from "@/lib/prisma";
import { isSupersededChecklist } from "@/lib/journey/checklists";
import { requireApiProfile } from "@/lib/auth/apiUser";
import { parseJsonBody } from "@/lib/validation/http";
import { attachJourneyDocumentSchema } from "@/lib/validation/schemas";
import { selectAttachmentCandidate } from "@/lib/journey/attachmentMatching";
import { attachDocumentToChecklistItem } from "@/lib/journey/attachDocumentToItem";

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

  const result = await attachDocumentToChecklistItem({
    item,
    documentId: document.id,
    actorUserId: user.id,
    supplyMessage: `${item.title} was supplied through Noodles for this application.`,
  });

  return Response.json({ attached: true, ...result });
}
