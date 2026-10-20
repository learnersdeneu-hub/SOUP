import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { logServerError } from "@/lib/logging/safe";
import { reconcileRecommenderWithJourney } from "@/lib/journey/reconcileRecommender";
import { recommendUploadFormSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED_EXTENSIONS = new Set(["pdf", "docx"]);
const ALLOWED_MIME = new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
const MAX_BYTES = 10 * 1024 * 1024;

// Token-authenticated, not session-authenticated: the recommender has no
// SOUP account (see src/app/recommend/[token]/page.tsx). Uses the admin
// Supabase client (bypasses RLS) for the same reason the staff-only
// offer-letter route does — there is no signed-in user here for RLS to
// scope the upload to.
export async function POST(request: Request, { params }: { params: { token: string } }) {
  const recommender = await prisma.recommender.findFirst({ where: { inviteToken: params.token }, select: { id: true, profileId: true, status: true, inviteTokenExpiresAt: true, profile: { select: { userId: true } } } });
  if (!recommender) return Response.json({ error: "This link is invalid." }, { status: 404 });
  if (recommender.inviteTokenExpiresAt && recommender.inviteTokenExpiresAt.getTime() < Date.now()) {
    return Response.json({ error: "This link has expired. Ask the student to resend your invite." }, { status: 410 });
  }
  if (recommender.status === "SUBMITTED") return Response.json({ error: "A letter has already been submitted for this request." }, { status: 409 });

  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "Invalid upload." }, { status: 400 }); }
  const parsedForm = recommendUploadFormSchema.safeParse(Object.fromEntries(form.entries()));
  const file = form.get("file");
  if (!parsedForm.success || !(file instanceof File)) return Response.json({ error: "Choose a file." }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_BYTES) return Response.json({ error: `Files must be ${MAX_BYTES / (1024 * 1024)} MB or smaller.` }, { status: 413 });
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.has(ext) || (file.type && !ALLOWED_MIME.has(file.type))) {
    return Response.json({ error: "Use PDF or DOCX." }, { status: 415 });
  }

  let admin;
  try { admin = createAdminClient(); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Upload storage is not configured." }, { status: 503 }); }
  const storageRef = `${recommender.profile.userId}/${randomUUID()}.${ext}`;
  const { error: uploadError } = await admin.storage.from("documents").upload(storageRef, file, { contentType: file.type || "application/pdf", upsert: false });
  if (uploadError) return Response.json({ error: `Secure upload failed: ${uploadError.message}` }, { status: 502 });

  let documentId: string;
  try {
    documentId = await prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          profileId: recommender.profileId,
          storageRef,
          documentType: "RECOMMENDATION_LETTER",
          originalFileName: file.name,
          // Not a real User id — this document was never uploaded by the
          // student. uploadedBy is a plain provenance string, not an
          // enforced foreign key (see Document model), so this is safe.
          uploadedBy: `recommender:${recommender.id}`,
          reviewStatus: "PENDING_REVIEW",
          processingStatus: "COMPLETE",
        },
        select: { id: true },
      });
      await tx.recommendationLetter.upsert({
        where: { recommenderId: recommender.id },
        create: { recommenderId: recommender.id, submissionMethod: "FILE", documentId: document.id },
        update: { submissionMethod: "FILE", documentId: document.id, letterText: null, submittedAt: new Date() },
      });
      await tx.recommender.update({ where: { id: recommender.id }, data: { status: "SUBMITTED" } });
      return document.id;
    });
  } catch (error) {
    logServerError("RECOMMENDER_UPLOAD_DATABASE_ERROR", error);
    await admin.storage.from("documents").remove([storageRef]).catch(() => undefined);
    return Response.json({ error: "Your file could not be saved. Please try again." }, { status: 500 });
  }

  await reconcileRecommenderWithJourney(recommender.profileId, recommender.id, { documentId }).catch((error) => logServerError("RECOMMENDER_UPLOAD_RECONCILE_ERROR", error));

  return Response.json({ ok: true });
}
