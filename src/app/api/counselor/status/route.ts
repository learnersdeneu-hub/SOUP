import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isSupersededChecklist } from "@/lib/journey/checklists";
import { deadlineUrgency, nextApplicationAction } from "@/lib/applications/lifecycle";
import { missingCoreApplicationInformation } from "@/lib/applications/readiness";

function nice(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function itemNeedsDocument(item: { status: string; metadata: unknown }) {
  if (!["WAITING_FOR_DOCUMENT", "ACTION_REQUIRED"].includes(item.status)) return false;
  const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
    ? item.metadata as Record<string, unknown>
    : {};
  return metadata.requiresDocument === true || item.status === "WAITING_FOR_DOCUMENT";
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({
      signedIn: false,
      stage: "EXPLORING",
      completed: 0,
      total: 0,
      documents: 0,
      applications: [],
      nextAction: "Tell SOUP what you want to study and where.",
      whatSoupIsDoing: "Building your student profile from this conversation.",
    });
  }

  const profile = await prisma.profile.findUnique({ where: { userId: user.id }, select: { id: true, user: { select: { fullName: true, dateOfBirth: true, nationality: true, currentCountry: true } } } });
  if (!profile) return Response.json({ error: "Profile not found." }, { status: 404 });

  const [studentCase, checklists, documents, applications] = await Promise.all([
    prisma.studentCase.findUnique({
      where: { profileId: profile.id },
      select: {
        stage: true,
        nextAction: true,
        targetDegreeLevel: true,
        targetSubject: true,
        preferredCountries: true,
        preferredRegions: true,
        preferredIntake: true,
        budgetMax: true,
        budgetCurrency: true,
        academicBackgroundSummary: true,
      },
    }),
    prisma.journeyChecklist.findMany({
      where: { profileId: profile.id },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        application: { include: { university: { select: { id: true, name: true } }, program: { select: { title: true } } } },
        items: { orderBy: { position: "asc" }, include: { document: { select: { reviewStatus: true, processingStatus: true, validUntil: true } } } },
      },
    }),
    prisma.document.count({ where: { profileId: profile.id } }),
    prisma.studentApplication.findMany({
      where: { profileId: profile.id },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { university: { select: { id: true, name: true } }, program: { select: { title: true, intake: true } } },
    }),
  ]);

  const activeChecklists = checklists.filter((item) => !isSupersededChecklist(item.sourceSnapshot));
  const currentChecklist = activeChecklists[0] || null;
  const items = currentChecklist?.items || [];
  const completed = items.filter((item) => item.status === "COMPLETE" || item.status === "DOCUMENT_UPLOADED").length;
  const nextItem = items.find((item) => !["COMPLETE", "DOCUMENT_UPLOADED", "NOT_APPLICABLE"].includes(item.status));

  let pendingDocument: null | { itemId: string; label: string; applicationId?: string; university?: string } = null;
  for (const checklist of activeChecklists) {
    const pending = checklist.items.find(itemNeedsDocument);
    if (!pending) continue;
    pendingDocument = {
      itemId: pending.id,
      label: pending.title,
      ...(checklist.applicationId ? { applicationId: checklist.applicationId } : {}),
      ...(checklist.application?.university?.name ? { university: checklist.application.university.name } : {}),
    };
    break;
  }

  const applicationSummaries = applications.map((application) => {
    const checklist = activeChecklists.find((candidate) => candidate.applicationId === application.id) || null;
    const requiredItems = checklist?.items.filter((item) => item.required && item.status !== "NOT_APPLICABLE") || [];
    const done = requiredItems.filter((item) => ["DOCUMENT_UPLOADED", "COMPLETE"].includes(item.status)).length;
    const progress = requiredItems.length ? Math.round((done / requiredItems.length) * 100) : null;
    const pending = requiredItems.find((item) => !["DOCUMENT_UPLOADED", "COMPLETE"].includes(item.status));
    return {
      id: application.id,
      universityId: application.university?.id || null,
      university: application.university?.name || "University application",
      program: application.program?.title || null,
      ownership: application.ownership,
      status: application.status,
      statusLabel: nice(application.status),
      intake: application.intake || application.program?.intake || null,
      deadline: application.deadlineAt || null,
      deadlineUrgency: deadlineUrgency(application.deadlineAt),
      eligibilityStatus: application.eligibilityStatus,
      applicationFeeStatus: application.applicationFeeStatus,
      externalReference: application.externalReference || null,
      progress,
      completedRequirements: done,
      totalRequirements: requiredItems.length,
      nextRequirement: pending?.title || null,
    };
  });

  const activeApplication = applicationSummaries.find((application) => !["REJECTED", "WITHDRAWN", "ENROLLED"].includes(application.status));
  const activeApplicationRecord = applications.find((application) => application.id === activeApplication?.id) || null;
  const activeChecklist = activeApplicationRecord ? activeChecklists.find((candidate) => candidate.applicationId === activeApplicationRecord.id) || null : null;
  const coreMissing = missingCoreApplicationInformation({
    fullName: profile.user.fullName,
    email: user.email,
    dateOfBirth: profile.user.dateOfBirth,
    nationality: profile.user.nationality,
    currentCountry: profile.user.currentCountry,
    academicBackgroundSummary: studentCase?.academicBackgroundSummary,
  });
  const applicationNextAction = activeApplicationRecord ? nextApplicationAction(activeApplicationRecord, activeChecklist?.items || [], coreMissing) : null;
  const whatSoupIsDoing = activeApplication
    ? activeApplication.status === "DOCUMENTS_REQUIRED"
      ? `Building and checking your ${activeApplication.university} application file.`
      : activeApplication.status === "READY_TO_SUBMIT"
        ? `Your ${activeApplication.university} file has student approval and is in final SOUP submission checks.`
        : activeApplication.status === "SUBMITTED" || activeApplication.status === "UNDER_REVIEW"
          ? `Tracking your ${activeApplication.university} application after submission.`
          : activeApplication.status === "OFFER_RECEIVED" || activeApplication.status === "CONDITIONAL_OFFER"
            ? `Moving your ${activeApplication.university} offer into the next stage of your journey.`
            : `Managing your ${activeApplication.university} application journey.`
    : studentCase?.stage === "SHORTLISTING"
      ? "Building your university shortlist from SOUP's catalog and verified research where needed."
      : "Building your student profile and deciding the next best action.";

  return Response.json({
    signedIn: true,
    stage: studentCase?.stage || "EXPLORING",
    completed,
    total: items.length,
    documents,
    applications: applicationSummaries,
    checklistTitle: currentChecklist?.title || null,
    nextAction: applicationNextAction?.text || (pendingDocument?.label
      ? `Upload ${pendingDocument.label}${pendingDocument.university ? ` for ${pendingDocument.university}` : ""}.`
      : nextItem?.title || studentCase?.nextAction || "Continue your conversation with Noodles."),
    nextActionOwner: applicationNextAction?.owner || null,
    whatSoupIsDoing,
    pendingDocument,
    known: {
      degree: studentCase?.targetDegreeLevel || null,
      subject: studentCase?.targetSubject || null,
      geography: Array.isArray(studentCase?.preferredCountries) && studentCase!.preferredCountries.length
        ? studentCase!.preferredCountries.join(", ")
        : Array.isArray(studentCase?.preferredRegions) ? studentCase!.preferredRegions.join(", ") : null,
      intake: studentCase?.preferredIntake || null,
      budget: studentCase?.budgetMax ? `${studentCase.budgetCurrency || ""} ${studentCase.budgetMax}`.trim() : null,
      legalName: profile.user.fullName || null,
      dateOfBirth: profile.user.dateOfBirth ? profile.user.dateOfBirth.toISOString().slice(0, 10) : null,
      nationality: profile.user.nationality || null,
      currentCountry: profile.user.currentCountry || null,
    },
  });
}
