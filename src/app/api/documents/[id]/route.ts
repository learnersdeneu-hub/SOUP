import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { requireApiProfile } from "@/lib/auth/apiUser";
import { logServerError } from "@/lib/logging/safe";

export const runtime = "nodejs";

// First real delete capability for a vault Document — every existing
// upload path treats documents as permanent, audited records. UploadBox's
// Delete action needs one for its category boxes (replace a wrong file
// without an orphaned old one sitting in the vault forever), but only when
// the document isn't actually relied on anywhere yet: once a document is
// attached to a checklist item, an application, a submitted recommendation
// letter or a writing override, deleting it would silently break that
// link, so those cases are rejected in favor of Replace instead.
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const current = await requireApiProfile();
  if (!current.ok) return current.response;
  const { profile } = current;

  const document = await prisma.document.findFirst({
    where: { id: params.id, profileId: profile.id },
    select: {
      id: true,
      storageRef: true,
      applicationLinks: { select: { id: true }, take: 1 },
      checklistItems: { select: { id: true }, take: 1 },
      offerForApplication: { select: { id: true } },
      recommendationLetterFor: { select: { id: true } },
      writingOverridesUsing: { select: { id: true }, take: 1 },
    },
  });
  if (!document) return Response.json({ error: "Document not found." }, { status: 404 });

  const attached = document.applicationLinks.length > 0
    || document.checklistItems.length > 0
    || Boolean(document.offerForApplication)
    || Boolean(document.recommendationLetterFor)
    || document.writingOverridesUsing.length > 0;
  if (attached) {
    return Response.json({ error: "This document is attached to a requirement or application — use Replace instead of Delete." }, { status: 409 });
  }

  const supabase = createClient();
  try {
    await prisma.$transaction([
      prisma.documentReviewEvent.deleteMany({ where: { documentId: document.id } }),
      prisma.document.delete({ where: { id: document.id } }),
    ]);
  } catch (error) {
    logServerError("DOCUMENT_DELETE_DATABASE_ERROR", error);
    return Response.json({ error: "Could not delete that document. Please try again." }, { status: 500 });
  }
  await supabase.storage.from("documents").remove([document.storageRef]).catch((error) => logServerError("DOCUMENT_DELETE_STORAGE_ERROR", error));

  return Response.json({ ok: true });
}
