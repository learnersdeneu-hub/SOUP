import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { requireApiProfile } from "@/lib/auth/apiUser";
import { logServerError } from "@/lib/logging/safe";
import { reconcileDocumentWithJourney } from "@/lib/journey/reconcile";
import { escapeHtml, sendTransactionalEmail } from "@/lib/notifications/email";
import { shouldSendStudentEmail } from "@/lib/notifications/preferences";
import { categoryUploadFormSchema } from "@/lib/validation/schemas";
import { isCategory, allowedMimeTypesForCategory, CATEGORY_CONFIG, CATEGORY_DOCUMENT_TYPE, MAX_CATEGORY_UPLOAD_BYTES } from "@/lib/documents/categories";
import { normalizeWritingDetails, type WritingDetails } from "@/lib/applications/coreProfile";

export const runtime = "nodejs";
export const maxDuration = 30;

// Profile-level, category-specific document upload for the boxes embedded
// directly in Profile & Details / Education Background / Testing / Funding
// / Extracurricular & Recommendations (see UploadBox.tsx). Mirrors the
// AI-free pattern in /api/applications/[id]/requirements/[itemId]/upload
// (storage + Document row only, no Gemini call) but is not tied to any one
// checklist item or application — these are vault-level uploads that may
// predate any application existing yet. reconcileDocumentWithJourney is
// still called so they auto-satisfy matching open requirements the moment
// an application/checklist does exist, exactly like the AI-classified path
// already does for /api/evidence/process.
export async function POST(request: Request) {
  const current = await requireApiProfile();
  if (!current.ok) return current.response;
  const { user, profile } = current;

  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "Invalid upload." }, { status: 400 }); }
  const parsedForm = categoryUploadFormSchema.safeParse(Object.fromEntries(form.entries()));
  const file = form.get("file");
  if (!parsedForm.success || !(file instanceof File)) return Response.json({ error: "Choose a document." }, { status: 400 });

  const { category, applicationId, boxType, replaceDocumentId } = parsedForm.data;
  // The category drives which documentType/validation rules apply — never
  // trust it for anything beyond picking from this fixed allow-list.
  if (!isCategory(category)) return Response.json({ error: "Unknown document category." }, { status: 400 });
  const config = CATEGORY_CONFIG[category];

  if (file.size <= 0 || file.size > MAX_CATEGORY_UPLOAD_BYTES) {
    return Response.json({ error: `Documents must be ${MAX_CATEGORY_UPLOAD_BYTES / (1024 * 1024)} MB or smaller.` }, { status: 413 });
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const allowedMimes = allowedMimeTypesForCategory(category);
  if (!config.extensions.includes(ext) || (file.type && !allowedMimes.has(file.type))) {
    return Response.json({ error: `Unsupported file type. Use ${config.extensions.join("/").toUpperCase()}.` }, { status: 415 });
  }

  const supabase = createClient();
  const storageRef = `${user.id}/${randomUUID()}.${ext}`;
  const { error: storageError } = await supabase.storage.from("documents").upload(storageRef, file, { contentType: file.type || "application/octet-stream", upsert: false });
  if (storageError) return Response.json({ error: `Secure upload failed: ${storageError.message}` }, { status: 502 });

  const documentType = CATEGORY_DOCUMENT_TYPE[category];

  // Replace is only honored against a document the student actually owns
  // and that still carries this same category — never trust the client's
  // claimed replaceDocumentId beyond that.
  let replacing: { id: string } | null = null;
  if (replaceDocumentId) {
    replacing = await prisma.document.findFirst({ where: { id: replaceDocumentId, profileId: profile.id, documentType }, select: { id: true } });
  }

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
          ...(replacing ? { replacementForId: replacing.id } : {}),
        },
        select: { id: true },
      });
      await tx.documentReviewEvent.create({ data: { documentId: created.id, profileId: profile.id, actorUserId: user.id, action: "SUBMITTED" } });
      if (replacing) {
        await tx.documentReviewEvent.create({ data: { documentId: replacing.id, profileId: profile.id, actorUserId: user.id, action: "REPLACED", reason: `Replaced by ${file.name}` } });
      }
      return created;
    });
  } catch (error) {
    logServerError("CATEGORY_UPLOAD_DATABASE_CREATE_ERROR", error);
    await supabase.storage.from("documents").remove([storageRef]).catch(() => undefined);
    return Response.json({ error: "SOUP could not register that secure upload. Nothing was added to your document vault; please try again." }, { status: 500 });
  }

  await reconcileDocumentWithJourney(profile.id, document.id, documentType).catch((error) => logServerError("CATEGORY_UPLOAD_RECONCILE_ERROR", error));

  // The writing boxes' "upload instead" alternative also saves directly
  // onto whichever draft it was uploaded from — a per-university override
  // when applicationId is set (My Colleges reflects it immediately without
  // a second save step), or the shared base draft on the student's profile
  // otherwise (src/app/profile/extracurricular) — so the completion check
  // in src/lib/queries/dashboard.ts (which reads
  // StudentCase.writingDetails[box].documentId, not just the vault) sees
  // the upload without the student also having to click "Save".
  if (category === "MOTIVATION_LETTER" || category === "PERSONAL_STATEMENT") {
    if (applicationId && boxType && (boxType === "MOTIVATION_LETTER" || boxType === "PERSONAL_STATEMENT")) {
      await prisma.applicationWritingOverride.upsert({
        where: { applicationId_boxType: { applicationId, boxType } },
        create: { applicationId, boxType, documentId: document.id, lastSavedAt: new Date() },
        update: { documentId: document.id, lastSavedAt: new Date() },
      }).catch((error) => logServerError("CATEGORY_UPLOAD_WRITING_OVERRIDE_ERROR", error));
    } else if (!applicationId) {
      const key = category === "MOTIVATION_LETTER" ? "motivationLetter" : "personalStatement";
      const studentCase = await prisma.studentCase.findUnique({ where: { profileId: profile.id }, select: { writingDetails: true } });
      const current = normalizeWritingDetails(studentCase?.writingDetails);
      const next: WritingDetails = { ...current, [key]: { ...current[key], documentId: document.id, lastSavedAt: new Date().toISOString() } };
      await prisma.studentCase.upsert({
        where: { profileId: profile.id },
        update: { writingDetails: next },
        create: { profileId: profile.id, writingDetails: next },
      }).catch((error) => logServerError("CATEGORY_UPLOAD_WRITING_DRAFT_ERROR", error));
    }
  }

  await prisma.notification.create({
    data: { profileId: profile.id, type: "DOCUMENT", title: "Document received", body: `${config.label} was added to your document vault.`, href: "/dashboard" },
  }).catch((error) => logServerError("CATEGORY_UPLOAD_NOTIFICATION_ERROR", error));

  if (shouldSendStudentEmail(profile, false)) {
    await sendTransactionalEmail({
      to: user.email,
      subject: "Document received",
      html: `<p>Hello ${escapeHtml(user.fullName)},</p><p>SOUP received <strong>${escapeHtml(file.name)}</strong> (${escapeHtml(config.label)}). It is saved in your document vault.</p>`,
      idempotencyKey: `document-received-${document.id}`,
    }).catch((error) => logServerError("CATEGORY_UPLOAD_EMAIL_ERROR", error));
  }

  return Response.json({ ok: true, documentId: document.id, originalFileName: file.name, uploadedAt: new Date().toISOString() });
}
