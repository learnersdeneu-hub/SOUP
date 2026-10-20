import { prisma } from "@/lib/prisma";
import { isSupersededChecklist } from "@/lib/journey/checklists";

const REFERENCE_LETTER_ALIASES = ["reference letter", "recommendation letter", "letter of recommendation", "academic reference", "professional reference"];

function normalize(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Shared with My Colleges (src/app/colleges/page.tsx) so the "fewer
// recommenders than required" warning (plan decision #7) uses exactly the
// same REFERENCE_LETTER detection as the reconciliation below, rather than
// a second, possibly-diverging alias list.
export function isReferenceLetterItem(item: { title: string; description: string | null; metadata: unknown }) {
  const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata) ? item.metadata as Record<string, unknown> : {};
  const expectedClass = String(metadata.documentClass || "").toUpperCase();
  if (expectedClass) return expectedClass === "REFERENCE_LETTER";
  const haystack = normalize(`${item.title} ${item.description || ""}`);
  return REFERENCE_LETTER_ALIASES.some((alias) => haystack.includes(alias));
}

// A recommender's letter is tied to the specific applications the student
// assigned that recommender to (RecommenderAssignment) — never applied
// across every application the way a reusable identity document is (see
// AUTO_REUSABLE_CLASSES in reconcile.ts, which deliberately excludes
// REFERENCE_LETTER for this exact reason): a letter addressed to one
// university should never silently satisfy another university's
// recommendation requirement just because the class name matches.
export async function reconcileRecommenderWithJourney(profileId: string, recommenderId: string, submission: { documentId: string | null }) {
  const assignments = await prisma.recommenderAssignment.findMany({ where: { recommenderId }, select: { applicationId: true } });
  const applicationIds = assignments.map((assignment) => assignment.applicationId);
  if (!applicationIds.length) return [];

  const items = await prisma.journeyChecklistItem.findMany({
    where: {
      checklist: { profileId, applicationId: { in: applicationIds } },
      status: { in: ["WAITING_FOR_DOCUMENT", "ACTION_REQUIRED", "NOT_STARTED"] },
    },
    include: { checklist: { select: { applicationId: true, sourceSnapshot: true } } },
    orderBy: { updatedAt: "desc" },
    take: 240,
  });
  const matches = items.filter((item) => !isSupersededChecklist(item.checklist.sourceSnapshot) && isReferenceLetterItem(item));
  if (!matches.length) return [];

  await prisma.$transaction(matches.map((item) => {
    const existingMetadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata) ? item.metadata as Record<string, unknown> : {};
    return prisma.journeyChecklistItem.update({
      where: { id: item.id },
      data: {
        ...(submission.documentId ? { documentId: submission.documentId } : {}),
        status: submission.documentId ? "DOCUMENT_UPLOADED" : "COMPLETE",
        completedAt: submission.documentId ? null : new Date(),
        metadata: { ...existingMetadata, recommenderId, recommenderSubmittedAt: new Date().toISOString() },
      },
    });
  }));

  return matches.map((item) => item.id);
}
