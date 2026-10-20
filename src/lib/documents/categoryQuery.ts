import { prisma } from "@/lib/prisma";
import { CATEGORY_DOCUMENT_TYPE, type DocumentCategory } from "@/lib/documents/categories";

export type CategoryDocument = {
  id: string;
  originalFileName: string | null;
  uploadedAt: string;
  reviewStatus: string;
};

// Server-only (Prisma-dependent) — kept out of categories.ts because that
// file is imported directly by the client component UploadBox.tsx for its
// type/config exports, the same boundary reason src/lib/applications/
// capacity.ts was split out from lifecycle.ts earlier in this project.
// Excludes any document that has already been superseded by a newer
// replacement (see replacementForId in /api/documents/category-upload),
// so a single-file box's "existing" list only ever shows the current head
// of its replace chain.
export async function getCategoryDocuments(profileId: string, category: DocumentCategory): Promise<CategoryDocument[]> {
  const documentType = CATEGORY_DOCUMENT_TYPE[category];
  const rows = await prisma.document.findMany({
    where: { profileId, documentType },
    select: { id: true, originalFileName: true, uploadedAt: true, reviewStatus: true, replacementForId: true },
    orderBy: { uploadedAt: "desc" },
  });
  const superseded = new Set(rows.map((row) => row.replacementForId).filter((id): id is string => Boolean(id)));
  return rows
    .filter((row) => !superseded.has(row.id))
    .map((row) => ({ id: row.id, originalFileName: row.originalFileName, uploadedAt: row.uploadedAt.toISOString(), reviewStatus: row.reviewStatus }));
}

// Batch variant for pages that need several categories at once (Education
// Background's per-degree-level boxes, Testing's per-test-block boxes).
export async function getCategoryDocumentsMap(profileId: string, categories: DocumentCategory[]): Promise<Record<string, CategoryDocument[]>> {
  const entries = await Promise.all(categories.map(async (category) => [category, await getCategoryDocuments(profileId, category)] as const));
  return Object.fromEntries(entries);
}
