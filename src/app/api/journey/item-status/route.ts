import { prisma } from "@/lib/prisma";
import { isSupersededChecklist } from "@/lib/journey/checklists";
import { checklistMetadata, isStudentActionItem } from "@/lib/applications/readiness";
import { requireApiProfile } from "@/lib/auth/apiUser";
import { parseJsonBody } from "@/lib/validation/http";
import { journeyItemStatusSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const current = await requireApiProfile();
  if (!current.ok) return current.response;
  const profile = current.profile;
  const parsed = await parseJsonBody(request, journeyItemStatusSchema);
  if (!parsed.ok) return parsed.response;
  const { itemId, status } = parsed.data;

  const item = await prisma.journeyChecklistItem.findFirst({ where: { id: itemId, checklist: { profileId: profile.id } }, include: { checklist: true } });
  if (!item) return Response.json({ error: "Journey item not found." }, { status: 404 });
  if (isSupersededChecklist(item.checklist.sourceSnapshot)) return Response.json({ error: "This checklist has been replaced by a newer official-source version." }, { status: 409 });
  if (item.checklist.kind === "ADMISSION") {
    const metadata = checklistMetadata(item.metadata);
    const requiresDocument = metadata.requiresDocument === true || Boolean(item.documentId);
    if (requiresDocument) {
      return Response.json({ error: "Application document requirements are completed through the secure upload/review flow." }, { status: 409 });
    }
    if (!isStudentActionItem(item)) {
      return Response.json({ error: "This is a SOUP admissions operation and cannot be completed by the student." }, { status: 409 });
    }
  }
  if (item.documentId && status === "COMPLETE") {
    return Response.json({ error: "Uploaded-document items remain marked as supplied until SOUP or the relevant workflow resolves them. This control is for external actions." }, { status: 409 });
  }

  const updated = await prisma.journeyChecklistItem.update({
    where: { id: item.id },
    data: {
      status,
      completedAt: status === "COMPLETE" ? new Date() : null,
      ...(item.checklist.kind === "ADMISSION" ? {
        metadata: {
          ...checklistMetadata(item.metadata),
          studentReportedComplete: status === "COMPLETE",
          studentReportedAt: status === "COMPLETE" ? new Date().toISOString() : null,
          universityApproved: false,
        },
      } : {}),
    },
  });
  return Response.json({ id: updated.id, status: updated.status });
}
