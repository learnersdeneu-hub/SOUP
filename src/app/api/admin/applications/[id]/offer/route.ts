import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getApiStaff } from "@/lib/auth/apiStaff";
import { APPLICATION_OPERATIONS_ROLES } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { escapeHtml, sendTransactionalEmail } from "@/lib/notifications/email";
import { logServerError } from "@/lib/logging/safe";
import { shouldSendStudentEmail } from "@/lib/notifications/preferences";
import { reconcileDocumentWithJourney } from "@/lib/journey/reconcile";
import { adminOfferUploadSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const staff = await getApiStaff(APPLICATION_OPERATIONS_ROLES);
  if (!staff) return Response.json({ error: "Staff access required." }, { status: 403 });
  const application = await prisma.studentApplication.findUnique({
    where: { id: params.id },
    include: { profile: { include: { user: true } }, university: true, program: true },
  });
  if (!application) return Response.json({ error: "Application not found." }, { status: 404 });
  if (application.ownership !== "SOUP_MANAGED") return Response.json({ error: "Offer uploads are available only for SOUP-managed applications." }, { status: 409 });

  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "Invalid upload." }, { status: 400 }); }
  const parsedForm = adminOfferUploadSchema.safeParse(Object.fromEntries(form.entries()));
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose the official offer letter." }, { status: 400 });
  if (!parsedForm.success) return Response.json({ error: "Invalid upload." }, { status: 400 });
  const conditional = parsedForm.data.conditional === "true";
  const allowed = new Set(["application/pdf", "image/png", "image/jpeg"]);
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const allowedExtensions = new Set(["pdf", "png", "jpg", "jpeg"]);
  if ((file.type && !allowed.has(file.type)) || !allowedExtensions.has(ext)) return Response.json({ error: "Offer letters must be PDF, PNG or JPEG." }, { status: 415 });
  if (file.size <= 0) return Response.json({ error: "The offer-letter file is empty." }, { status: 400 });
  if (file.size > 15 * 1024 * 1024) return Response.json({ error: "Offer letter is too large. Maximum size is 15 MB." }, { status: 413 });

  const storageRef = `${application.profile.userId}/${randomUUID()}.${ext}`;
  let admin;
  try { admin = createAdminClient(); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Staff storage is not configured." }, { status: 503 }); }
  const { error: uploadError } = await admin.storage.from("documents").upload(storageRef, file, { contentType: file.type || "application/pdf", upsert: false });
  if (uploadError) return Response.json({ error: `Secure offer upload failed: ${uploadError.message}` }, { status: 502 });

  try {
    const document = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          profileId: application.profileId,
          storageRef,
          documentType: "OFFER_LETTER",
          originalFileName: file.name,
          uploadedBy: staff.user.id,
          reviewStatus: "APPROVED",
          processingStatus: "COMPLETE",
          sourceWorkflow: "COUNSELOR",
          aiAnalysis: { source: "SOUP_STAFF_UPLOAD", authorityApproved: false, note: "Official document uploaded into SOUP by staff; the document's issuing institution remains authoritative." },
          aiProcessedAt: new Date(),
        },
      });
      await tx.documentReviewEvent.create({ data: { documentId: doc.id, profileId: application.profileId, actorUserId: staff.user.id, action: "APPROVED", reason: "Offer letter uploaded by SOUP staff for this managed application." } });
      await tx.studentApplication.update({
        where: { id: application.id },
        data: { offerDocumentId: doc.id, status: conditional ? "CONDITIONAL_OFFER" : "OFFER_RECEIVED", decisionAt: new Date() },
      });
      await tx.studentApplicationEvent.create({
        data: {
          applicationId: application.id,
          actorUserId: staff.user.id,
          eventType: "OFFER_UPLOADED",
          fromStatus: application.status,
          toStatus: conditional ? "CONDITIONAL_OFFER" : "OFFER_RECEIVED",
          message: `${conditional ? "Conditional offer" : "Offer letter"} uploaded by SOUP staff and added to the student's vault.`,
          metadata: { documentId: doc.id, authorityApproved: false },
        },
      });
      await tx.studentApplicationDocument.upsert({
        where: { applicationId_documentId: { applicationId: application.id, documentId: doc.id } },
        update: { documentRole: "OFFER_LETTER", required: false },
        create: { applicationId: application.id, documentId: doc.id, documentRole: "OFFER_LETTER", required: false },
      });
      await tx.studentCase.update({ where: { id: application.studentCaseId }, data: { stage: "OFFER_RECEIVED", nextAction: "Review the new offer with Noodles and move into visa, accommodation, insurance and pre-departure planning." } });
      await tx.notification.create({
        data: {
          profileId: application.profileId,
          type: "DOCUMENT",
          title: `${conditional ? "Conditional offer" : "Offer"} received`,
          body: `${application.university?.name || "Your university"}${application.program?.title ? ` · ${application.program.title}` : ""} has an offer letter in your SOUP document vault.`,
          href: "/applications",
        },
      });
      return doc;
    });
    const appUrl = String(process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
    await reconcileDocumentWithJourney(application.profileId, document.id, "OFFER_LETTER").catch((error) => logServerError("SOUP_OFFER_JOURNEY_RECONCILE_ERROR", error));
    if (shouldSendStudentEmail(application.profile, true)) await sendTransactionalEmail({
      to: application.profile.user.email,
      subject: `${conditional ? "Conditional offer" : "Offer"} received — ${application.university?.name || "SOUP"}`,
      idempotencyKey: `offer/${application.id}/${document.id}`,
      html: `<p>Hello ${escapeHtml(application.profile.user.fullName)},</p><p>Your ${conditional ? "conditional offer" : "offer letter"} from <strong>${escapeHtml(application.university?.name || "your university")}</strong>${application.program?.title ? ` for ${escapeHtml(application.program.title)}` : ""} has been added to your SOUP account.</p><p>${appUrl ? `<a href="${appUrl}/applications">Open My SOUP</a>` : "Sign in to SOUP to review the application and document."}</p><p>Your Noodles can now help you with the next admission, visa, accommodation, insurance and pre-departure steps.</p>`,
    }).catch((error) => logServerError("SOUP_OFFER_EMAIL_ERROR", error));
    return Response.json({ documentId: document.id, status: conditional ? "CONDITIONAL_OFFER" : "OFFER_RECEIVED" });
  } catch (error) {
    await admin.storage.from("documents").remove([storageRef]).catch(() => undefined);
    return Response.json({ error: error instanceof Error ? error.message : "Could not attach the offer letter to this application." }, { status: 500 });
  }
}
