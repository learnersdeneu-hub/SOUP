import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { requireApiProfile } from "@/lib/auth/apiUser";
import { logServerError } from "@/lib/logging/safe";
import { checklistMetadata } from "@/lib/applications/readiness";
import { attachDocumentToChecklistItem } from "@/lib/journey/attachDocumentToItem";
import { escapeHtml, sendTransactionalEmail } from "@/lib/notifications/email";
import { shouldSendStudentEmail } from "@/lib/notifications/preferences";
import { requirementUploadFormSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
// No AI call happens on this path at all, unlike /api/evidence/process
// (120s, Gemini vision/text analysis) — this is deliberately a plain
// storage + database operation, so it stays fast and never depends on
// Gemini being up. See the requirement to remove the AI/Counselor
// dependency from the application requirements upload flow.
export const maxDuration = 30;

const ALLOWED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
const ALLOWED_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "docx"]);

// Direct, AI-independent document upload for one specific application
// requirement. Reuses the same Supabase "documents" storage bucket and
// Document/JourneyChecklistItem/StudentApplicationDocument models every
// other upload path already uses (see /api/evidence/process for the
// Noodles-driven equivalent) — this is a second entry point into the same
// architecture, not a parallel one. The one real difference: because the
// student clicked "Upload Document" on a specific, already-known
// requirement, there is no ambiguity to resolve and no AI classification
// needed — documentType comes directly from the requirement's own
// metadata.documentClass (set when the requirements checklist was
// generated), and attachDocumentToChecklistItem (shared with the Noodles
// attach flow) does the actual binding deterministically.
export async function POST(request: Request, { params }: { params: { id: string; itemId: string } }) {
  const current = await requireApiProfile();
  if (!current.ok) return current.response;
  const { user, profile } = current;

  const item = await prisma.journeyChecklistItem.findFirst({
    where: {
      id: params.itemId,
      status: { in: ["WAITING_FOR_DOCUMENT", "ACTION_REQUIRED", "NOT_STARTED", "DOCUMENT_UPLOADED"] },
      checklist: { kind: "ADMISSION", profileId: profile.id, applicationId: params.id },
    },
    include: { checklist: { select: { applicationId: true } } },
  });
  if (!item) return Response.json({ error: "This requirement could not be found, or a document can no longer be uploaded against it." }, { status: 404 });

  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "Invalid upload." }, { status: 400 }); }
  const parsedForm = requirementUploadFormSchema.safeParse(Object.fromEntries(form.entries()));
  const file = form.get("file");
  if (!parsedForm.success || !(file instanceof File)) return Response.json({ error: "Choose a document." }, { status: 400 });
  if (file.size <= 0 || file.size > 15 * 1024 * 1024) return Response.json({ error: "Documents must be 15 MB or smaller." }, { status: 413 });
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if ((file.type && !ALLOWED_TYPES.has(file.type)) || !ALLOWED_EXTENSIONS.has(ext)) return Response.json({ error: "Unsupported document type. Use PDF, PNG, JPG or DOCX." }, { status: 415 });

  const supabase = createClient();
  const storageRef = `${user.id}/${randomUUID()}.${ext}`;
  const { error: storageError } = await supabase.storage.from("documents").upload(storageRef, file, { contentType: file.type || "application/octet-stream", upsert: false });
  if (storageError) return Response.json({ error: `Secure upload failed: ${storageError.message}` }, { status: 502 });

  const requirementMetadata = checklistMetadata(item.metadata);
  const documentType = String(requirementMetadata.documentClass || "").trim().slice(0, 120) || "OTHER";

  let document: { id: string };
  try {
    document = await prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: {
          profileId: profile.id,
          storageRef,
          documentType,
          originalFileName: file.name,
          uploadedBy: user.id,
          reviewStatus: "PENDING_REVIEW",
          processingStatus: "COMPLETE",
        },
        select: { id: true },
      });
      await tx.documentReviewEvent.create({ data: { documentId: created.id, profileId: profile.id, actorUserId: user.id, action: "SUBMITTED" } });
      return created;
    });
  } catch (error) {
    logServerError("REQUIREMENT_UPLOAD_DATABASE_CREATE_ERROR", error);
    await supabase.storage.from("documents").remove([storageRef]).catch(() => undefined);
    return Response.json({ error: "SOUP could not register that secure upload. Nothing was added to your document vault; please try again." }, { status: 500 });
  }

  const result = await attachDocumentToChecklistItem({
    item,
    documentId: document.id,
    actorUserId: user.id,
    supplyMessage: `${item.title} was uploaded directly on the application page.`,
  });

  const universityName = (await prisma.studentApplication.findUnique({ where: { id: params.id }, select: { university: { select: { name: true } } } }))?.university?.name || "your application";
  await prisma.notification.create({
    data: { profileId: profile.id, type: "DOCUMENT", title: "Document received", body: `${item.title} was uploaded for ${universityName} and is ready for review.`, href: `/applications/${params.id}` },
  }).catch((error) => logServerError("REQUIREMENT_UPLOAD_NOTIFICATION_ERROR", error));
  const staffProfiles = await prisma.profile.findMany({
    where: { user: { role: { in: ["ADMIN", "SUPPORT"] }, accountStatus: "ACTIVE" } },
    select: { id: true },
  }).catch(() => []);
  if (staffProfiles.length) {
    await prisma.notification.createMany({
      data: staffProfiles.map((staffProfile) => ({
        profileId: staffProfile.id,
        type: "DOCUMENT" as const,
        title: "Document awaiting review",
        body: `${user.email} uploaded ${item.title} for ${universityName}.`,
        href: "/admin/documents",
      })),
    }).catch((error) => logServerError("REQUIREMENT_UPLOAD_STAFF_NOTIFICATION_ERROR", error));
  }
  if (shouldSendStudentEmail(profile, false)) await sendTransactionalEmail({
    to: user.email,
    subject: "Document received",
    html: `<p>Hello ${escapeHtml(user.fullName)},</p><p>SOUP received <strong>${escapeHtml(file.name)}</strong> for <strong>${escapeHtml(item.title)}</strong> (${escapeHtml(universityName)}). It is saved in your document vault and ready for review.</p>`,
    idempotencyKey: `document-received-${document.id}`,
  }).catch((error) => logServerError("REQUIREMENT_UPLOAD_EMAIL_ERROR", error));

  return Response.json({ ok: true, documentId: document.id, ...result });
}
