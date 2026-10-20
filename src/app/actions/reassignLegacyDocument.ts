"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/auth/currentUser";
import { reconcileDocumentWithJourney } from "@/lib/journey/reconcile";
import { isCategory, CATEGORY_DOCUMENT_TYPE, type DocumentCategory } from "@/lib/documents/categories";

// One-time "which one is this?" reassignment for documents uploaded
// through the old generic Standard Documents flow under the old, degree-
// level-agnostic ACADEMIC_TRANSCRIPT / DEGREE_CERTIFICATE classes — see
// plan decision #2. In-place documentType update only: no re-upload, no
// new storage object, fully reversible by picking a different box later.
export async function reassignLegacyDocument(documentId: string, newCategory: DocumentCategory) {
  const { profile } = await requireProfile();
  if (!isCategory(newCategory)) throw new Error("Unknown document category.");

  const document = await prisma.document.findFirst({
    where: { id: documentId, profileId: profile.id, documentType: { in: ["ACADEMIC_TRANSCRIPT", "DEGREE_CERTIFICATE"] } },
  });
  if (!document) throw new Error("That document could not be found, or has already been reassigned.");

  const newDocumentType = CATEGORY_DOCUMENT_TYPE[newCategory];
  await prisma.document.update({ where: { id: document.id }, data: { documentType: newDocumentType } });
  await reconcileDocumentWithJourney(profile.id, document.id, newDocumentType).catch(() => undefined);

  revalidatePath("/profile/education");
  revalidatePath("/dashboard");
}
