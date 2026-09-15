import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureStudentCase } from "@/lib/student/case";
import { applicationKey } from "@/lib/applications/lifecycle";
import { sendTransactionalEmail, escapeHtml } from "@/lib/notifications/email";
import { shouldSendStudentEmail } from "@/lib/notifications/preferences";
import { requireApiProfile } from "@/lib/auth/apiUser";
import { parseJsonBody } from "@/lib/validation/http";
import { startApplicationSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const current = await requireApiProfile();
  if (!current.ok) return current.response;
  const { authUser: user } = current;
  const profile = await prisma.profile.findUnique({ where: { id: current.profile.id }, include: { user: true } });
  if (!profile) return Response.json({ error: "Your SOUP profile is not ready yet." }, { status: 409 });
  const parsed = await parseJsonBody(request, startApplicationSchema);
  if (!parsed.ok) return parsed.response;
  const { shortlistItemId, universityId, programId, intake: requestedIntake } = parsed.data;

  // Two entry paths create the exact same StudentApplication record: from an
  // AI-generated shortlist recommendation (shortlistItemId present), or directly
  // by the student without Noodles (Direct Application — shortlistItemId absent).
  const shortlistItem = shortlistItemId ? await prisma.universityShortlistItem.findFirst({
    where: {
      id: shortlistItemId,
      universityId,
      programId,
      isPartnerAtGeneration: true,
      shortlist: { profileId: profile.id },
    },
    select: { id: true, shortlistId: true, eligibilityStatus: true, cautions: true, rationale: true },
  }) : null;
  if (shortlistItemId && !shortlistItem) {
    return Response.json({ error: "This application must be started from a current SOUP Partner recommendation in your saved Application Plan." }, { status: 409 });
  }

  const university = await prisma.university.findUnique({ where: { id: universityId }, include: { partner: true } });
  if (!university) return Response.json({ error: "University not found." }, { status: 404 });
  const isActivePartnerUniversity = Boolean(university.partner && university.partner.status === "ACTIVE" && university.partner.type === "UNIVERSITY");
  if (shortlistItem && !isActivePartnerUniversity) {
    return Response.json({ error: "This is an independent recommendation. SOUP cannot submit this application through the platform; use the official university application route instead." }, { status: 409 });
  }
  const program = programId ? await prisma.universityProgram.findFirst({ where: { id: programId, universityId, active: true } }) : null;
  if (programId && !program) return Response.json({ error: "Program not found for this university." }, { status: 404 });

  // A managed application is program + intake specific. If program eligibility has not
  // been established, create the case in NEEDS_REVIEW rather than pretending certainty.
  const intake = (requestedIntake || program?.intake || "").trim().slice(0, 160) || null;

  let ownership: "SOUP_MANAGED" | "STUDENT_MANAGED_EXTERNAL";
  let initialStatus: "DOCUMENTS_REQUIRED" | "SHORTLISTED";
  let eligibilityStatus: "LIKELY_ELIGIBLE" | "NEEDS_REVIEW" | "NOT_CHECKED";
  let eligibilityNotes: Prisma.InputJsonValue | undefined;
  let startedNote: string;
  let eventSource: string;

  if (shortlistItem) {
    const rawEligibility = String(shortlistItem.eligibilityStatus || "").toUpperCase();
    if (["NOT_ELIGIBLE", "INELIGIBLE"].includes(rawEligibility)) {
      return Response.json({ error: "This saved plan marks the selected program as not eligible. Ask the Counselor to review another route before starting an application." }, { status: 409 });
    }
    ownership = "SOUP_MANAGED";
    initialStatus = "DOCUMENTS_REQUIRED";
    eligibilityStatus = ["ELIGIBLE", "LIKELY_ELIGIBLE", "SUITABLE"].includes(rawEligibility) ? "LIKELY_ELIGIBLE" : "NEEDS_REVIEW";
    eligibilityNotes = { shortlistEligibility: shortlistItem.eligibilityStatus || null, rationale: shortlistItem.rationale || null, cautions: shortlistItem.cautions || null };
    startedNote = "Started by student from a SOUP partner recommendation.";
    eventSource = "SOUP_PARTNER_RECOMMENDATION";
  } else if (isActivePartnerUniversity) {
    // Direct Application to an active SOUP partner university: SOUP can manage it,
    // identically to the shortlist path, just without a prior AI eligibility check.
    ownership = "SOUP_MANAGED";
    initialStatus = "DOCUMENTS_REQUIRED";
    eligibilityStatus = "NOT_CHECKED";
    startedNote = "Started directly by the student through Direct Application.";
    eventSource = "STUDENT_DIRECT_APPLY";
  } else {
    // Direct Application to a non-partner university: SOUP tracks it as a
    // self-managed application (documents, journey, notifications still apply)
    // but never claims to submit it.
    ownership = "STUDENT_MANAGED_EXTERNAL";
    initialStatus = "SHORTLISTED";
    eligibilityStatus = "NOT_CHECKED";
    startedNote = "Added by the student as a self-managed application. SOUP does not submit this application.";
    eventSource = "STUDENT_DIRECT_APPLY_EXTERNAL";
  }

  const key = applicationKey(profile.id, universityId, programId, intake);
  const studentCase = await ensureStudentCase(profile.id);
  const existing = await prisma.studentApplication.findFirst({ where: { OR: [{ applicationKey: key }, { profileId: profile.id, universityId, programId, intake }] } });
  if (existing) return Response.json({ application: existing, duplicate: true });

  const parsedDeadline = (() => {
    if (!program?.applicationDeadline) return null;
    const parsed = new Date(program.applicationDeadline);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  })();

  if (parsedDeadline && parsedDeadline.getTime() < Date.now()) return Response.json({ error: "The saved application deadline for this program has passed. Ask the Counselor to verify whether a later intake is open." }, { status: 409 });

  const application = await prisma.$transaction(async (tx) => {
    const created = await tx.studentApplication.create({
      data: {
        profileId: profile.id,
        studentCaseId: studentCase.id,
        universityId,
        programId,
        ownership,
        status: initialStatus,
        applicationKey: key,
        intake,
        deadlineAt: parsedDeadline,
        deadlineSourceUrl: program?.sourceUrl || university.sourceUrl || university.websiteUrl || null,
        deadlineCheckedAt: parsedDeadline ? (program?.sourceCheckedAt || university.sourceCheckedAt || new Date()) : null,
        eligibilityStatus,
        eligibilityCheckedAt: new Date(),
        eligibilitySourceUrl: program?.sourceUrl || university.sourceUrl || university.websiteUrl || null,
        ...(eligibilityNotes ? { eligibilityNotes } : {}),
        lastStudentActionAt: new Date(),
        notes: startedNote,
      },
    });
    await tx.studentApplicationEvent.create({
      data: {
        applicationId: created.id,
        actorUserId: user.id,
        eventType: "APPLICATION_STARTED",
        toStatus: initialStatus,
        message: ownership === "SOUP_MANAGED" ? `Student started a SOUP-managed application to ${university.name}.` : `Student added a self-managed application to ${university.name}.`,
        metadata: { source: eventSource, programId, intake, shortlistItemId: shortlistItem?.id, shortlistId: shortlistItem?.shortlistId, eligibilityStatus },
      },
    });
    await tx.studentCase.update({ where: { id: studentCase.id }, data: { stage: "APPLYING", nextAction: ownership === "SOUP_MANAGED" ? `Continue your ${university.name} application and provide only the documents the Counselor or admissions team requests.` : `Track your ${university.name} application here; upload documents so SOUP can help even though SOUP does not submit this one.` } });
    await tx.notification.create({ data: { profileId: profile.id, type: "SYSTEM", title: "Application started", body: `${university.name} is now tracked in My SOUP applications.`, href: "/applications" } });
    return created;
  });
  if (shouldSendStudentEmail(profile, false)) await sendTransactionalEmail({
    to: profile.user.email,
    subject: `Application started — ${university.name}`,
    html: `<p>Hello ${escapeHtml(profile.user.fullName)},</p><p>Your application to <strong>${escapeHtml(university.name)}</strong>${program?.title ? ` for ${escapeHtml(program.title)}` : ""} has been started${ownership === "SOUP_MANAGED" ? " and is SOUP-managed" : " and is tracked as a self-managed application"}.</p><p>${ownership === "SOUP_MANAGED" ? "Noodles and the SOUP application team will now guide the missing information and documents one step at a time." : "SOUP will not submit this application on your behalf, but you can still track documents and status here."} University application fees, if any, are separate and will appear in My SOUP → Payments.</p>`,
    idempotencyKey: `application-started-${application.id}`,
  }).catch(() => undefined);
  return Response.json({ application });
}
