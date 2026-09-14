"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/currentUser";
import { DOCUMENT_ROLES } from "@/lib/auth/roles";
import type { DocumentReviewAction, DocumentReviewStatus } from "@prisma/client";


async function assertDocumentAccess(current: Awaited<ReturnType<typeof requireRole>>, profileId: string) {
  if (["ADMIN", "SUPER_ADMIN", "COUNSELOR", "ADMISSIONS"].includes(current.user.role)) return;
  const assigned = await prisma.supportTicket.count({ where: { profileId, assignedToUserId: current.user.id } });
  if (!assigned) throw new Error("This customer is not assigned to your support queue.");
}

const STATUS_TO_ACTION: Record<Exclude<DocumentReviewStatus, "UPLOADED">, DocumentReviewAction> = {
  PENDING_REVIEW: "SUBMITTED",
  MORE_INFO_REQUIRED: "REQUESTED_MORE_INFO",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
};

export async function updateDocumentReview(
  documentId: string,
  status: Exclude<DocumentReviewStatus, "UPLOADED">,
  reason?: string,
) {
  const current = await requireRole(DOCUMENT_ROLES);
  const document = await prisma.document.findUniqueOrThrow({
    where: { id: documentId },
    include: { profile: true, credential: { include: { credentialType: true } } },
  });
  await assertDocumentAccess(current, document.profileId);

  if ((status === "REJECTED" || status === "MORE_INFO_REQUIRED") && !reason?.trim()) {
    throw new Error("A reason is required for this review outcome.");
  }
  if (status === "APPROVED" && !["ADMIN", "SUPER_ADMIN"].includes(current.user.role)) {
    throw new Error("Only an administrator can approve a document.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.document.update({
      where: { id: documentId },
      data: {
        reviewStatus: status,
        reviewReason: reason?.trim() || null,
        reviewedAt: status === "PENDING_REVIEW" ? null : new Date(),
      },
    });

    await tx.documentReviewEvent.create({
      data: {
        documentId,
        profileId: document.profileId,
        actorUserId: current.user.id,
        action: STATUS_TO_ACTION[status],
        reason: reason?.trim() || null,
      },
    });

    const label = document.credential?.credentialType.label || document.documentType;
    await tx.notification.create({
      data: {
        profileId: document.profileId,
        type: status === "APPROVED" ? "VERIFICATION" : "DOCUMENT",
        title:
          status === "APPROVED" ? "Document approved" :
          status === "MORE_INFO_REQUIRED" ? "More information required" :
          status === "REJECTED" ? "Document needs attention" :
          status === "EXPIRED" ? "Document expired" : "Document submitted for review",
        body:
          status === "APPROVED" ? `${label} has passed document review.` :
          status === "MORE_INFO_REQUIRED" ? (reason?.trim() || "Please provide more information.") :
          status === "REJECTED" ? (reason?.trim() || "The document could not be accepted.") :
          status === "EXPIRED" ? `${label} is no longer current.` : `${label} is now waiting for review.`,
        href: "/documents",
      },
    });
  });

  revalidatePath("/admin/documents");
  revalidatePath("/documents");
  revalidatePath("/dashboard");
}

export async function getAdminDocumentSignedUrl(documentId: string) {
  const current = await requireRole(DOCUMENT_ROLES);
  const document = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
  await assertDocumentAccess(current, document.profileId);
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from("documents").createSignedUrl(document.storageRef, 60 * 5);
  if (error) throw new Error(`Could not create secure preview: ${error.message}`);
  return data.signedUrl;
}
