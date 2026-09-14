import { prisma } from "@/lib/prisma";
import { getActiveServicePartners, getRelevantUniversityPartners } from "@/lib/partners/relevance";
import { isSupersededChecklist } from "@/lib/journey/checklists";

export async function getStudentCounselorContext(profileId: string) {
  const [profile, studentCase, documents, applications, checklists, shortlists, referrals, counselorSessions] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: profileId },
      include: { user: { select: { email: true, fullName: true, dateOfBirth: true, nationality: true, currentCountry: true } } },
    }),
    prisma.studentCase.findUnique({ where: { profileId } }),
    prisma.document.findMany({
      where: { profileId },
      orderBy: { uploadedAt: "desc" },
      take: 15,
      select: { id: true, documentType: true, originalFileName: true, uploadedAt: true, documentIssuedAt: true, validUntil: true, reviewStatus: true, processingStatus: true, aiAnalysis: true },
    }),
    prisma.studentApplication.findMany({
      where: { profileId },
      orderBy: { updatedAt: "desc" },
      take: 15,
      include: { university: { select: { name: true, country: true, city: true } }, program: { select: { title: true, level: true, intake: true } }, offerConditions: { orderBy: [{ status: "asc" }, { dueAt: "asc" }] } },
    }),
    prisma.journeyChecklist.findMany({
      where: { profileId },
      orderBy: { updatedAt: "desc" },
      take: 15,
      include: { items: { orderBy: { position: "asc" }, take: 40 } },
    }),
    prisma.universityShortlist.findMany({
      where: { profileId },
      orderBy: { generatedAt: "desc" },
      take: 3,
      include: {
        items: {
          orderBy: { position: "asc" },
          include: {
            university: { select: { name: true, country: true, city: true, websiteUrl: true, partnerId: true } },
            program: { select: { title: true, level: true, tuitionAmount: true, tuitionCurrency: true, sourceUrl: true } },
          },
        },
      },
    }),
    prisma.serviceReferral.findMany({
      where: { profileId },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: { partner: { select: { name: true, type: true, transactionUrl: true, websiteUrl: true, status: true } } },
    }),
    prisma.counselorSession.findMany({ where: { profileId, status: { in: ["REQUESTED", "SCHEDULED"] } }, orderBy: { updatedAt: "desc" }, take: 3, select: { id: true, status: true, requestedDate: true, requestedTimeNote: true, scheduledFor: true, durationMinutes: true, meetingUrl: true } }),
  ]);

  const preferredCountryList = Array.isArray(studentCase?.preferredCountries)
    ? studentCase!.preferredCountries.map((value) => String(value)).filter(Boolean).slice(0, 8)
    : [];
  const [relevantUniversityPartners, activeServicePartners, catalogUniversityOptions, networkUniversitiesNeedingResearch] = await Promise.all([
    getRelevantUniversityPartners(studentCase, 24),
    getActiveServicePartners(),
    prisma.university.findMany({
      where: {
        ...(preferredCountryList.length ? { country: { in: preferredCountryList } } : {}),
        programs: { some: { active: true } },
      },
      orderBy: [{ partnerId: "desc" }, { name: "asc" }],
      take: 24,
      // No internal database id is selected here (university or program):
      // this data is only ever used to build the AI's saved-context JSON, and
      // a raw id has previously leaked verbatim into a visible reply (e.g.
      // "Program & Fee: ... [1526bbd5-a108-4562-890e-caf9e3d863bc]") because
      // nothing stops the model from echoing back a field it was given.
      select: {
        name: true, country: true, city: true, websiteUrl: true, partnerId: true, sourceCheckedAt: true,
        programs: { where: { active: true }, take: 3, select: { title: true, level: true, field: true, language: true, tuitionAmount: true, tuitionCurrency: true, intake: true, applicationDeadline: true, sourceUrl: true, sourceCheckedAt: true } },
      },
    }),
    prisma.university.findMany({
      where: {
        ...(preferredCountryList.length ? { country: { in: preferredCountryList } } : {}),
        partner: { is: { type: "UNIVERSITY", status: "ACTIVE" } },
        programs: { none: { active: true } },
      },
      orderBy: [{ name: "asc" }],
      take: 24,
      select: { name: true, country: true, city: true, websiteUrl: true, partnerId: true, publicMetadata: true },
    }),
  ]);

  const compactApplications = applications.map((item) => ({
    id: item.id,
    ownership: item.ownership,
    status: item.status,
    university: item.university,
    program: item.program,
    submittedAt: item.submittedAt,
    decisionAt: item.decisionAt,
    externalApplicationUrl: item.externalApplicationUrl,
    intake: item.intake || item.program?.intake || null,
    deadlineAt: item.deadlineAt,
    deadlineCheckedAt: item.deadlineCheckedAt,
    eligibilityStatus: item.eligibilityStatus,
    eligibilityCheckedAt: item.eligibilityCheckedAt,
    applicationFeeStatus: item.applicationFeeStatus,
    applicationFeeAmount: item.applicationFeeAmount,
    applicationFeeCurrency: item.applicationFeeCurrency,
    assignedStaffUserId: item.assignedStaffUserId,
    studentApprovedAt: item.studentApprovedAt,
    externalReference: item.externalReference,
    withdrawnAt: item.withdrawnAt,
    offerConditions: item.offerConditions.map((condition) => ({ id: condition.id, title: condition.title, status: condition.status, dueAt: condition.dueAt, sourceCheckedAt: condition.sourceCheckedAt })),
  }));

  const compactChecklists = checklists.filter((checklist) => !isSupersededChecklist(checklist.sourceSnapshot)).slice(0, 10).map((checklist) => ({
    id: checklist.id,
    applicationId: checklist.applicationId,
    kind: checklist.kind,
    title: checklist.title,
    destinationCountry: checklist.destinationCountry,
    authorityName: checklist.authorityName,
    sourceUrl: checklist.sourceUrl,
    sourceCheckedAt: checklist.sourceCheckedAt,
    items: checklist.items.map((item) => {
      const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
        ? item.metadata as Record<string, unknown>
        : {};
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        position: item.position,
        status: item.status,
        required: item.required,
        externalActionUrl: item.externalActionUrl,
        externalActionLabel: item.externalActionLabel,
        documentId: item.documentId,
        completedAt: item.completedAt,
        dueAt: item.dueAt,
        metadata: {
          requiresDocument: Boolean(metadata.requiresDocument),
          documentClass: metadata.documentClass || null,
          authorityApproved: metadata.authorityApproved === true,
          responsibleParty: String(metadata.responsibleParty || "STUDENT"),
          approvalBlocking: metadata.approvalBlocking !== false,
          studentReportedComplete: metadata.studentReportedComplete === true,
        },
      };
    }),
  }));

  const compactReferrals = referrals.map((item) => ({
    id: item.id,
    type: item.type,
    status: item.status,
    title: item.title,
    externalUrl: item.externalUrl,
    convertedAt: item.convertedAt,
    studentPreferences: item.partnerId ? null : item.metadata,
    partner: item.partner ? {
      name: item.partner.name,
      type: item.partner.type,
      status: item.partner.status,
      websiteUrl: item.partner.websiteUrl,
      transactionUrl: item.partner.transactionUrl,
    } : null,
  }));
  const compactDocuments = documents.map((document) => {
    const analysis = document.aiAnalysis && typeof document.aiAnalysis === "object" && !Array.isArray(document.aiAnalysis)
      ? document.aiAnalysis as Record<string, unknown>
      : {};
    return {
      id: document.id,
      documentType: document.documentType,
      originalFileName: document.originalFileName,
      uploadedAt: document.uploadedAt,
      documentIssuedAt: document.documentIssuedAt,
      validUntil: document.validUntil,
      reviewStatus: document.reviewStatus,
      processingStatus: document.processingStatus,
      analysis: {
        documentClass: analysis.documentClass,
        summary: analysis.summary,
        facts: Array.isArray(analysis.facts) ? analysis.facts.slice(0, 12) : [],
        missingOrUnclear: Array.isArray(analysis.missingOrUnclear) ? analysis.missingOrUnclear.slice(0, 8) : [],
      },
    };
  });

  const compactStudentCase = studentCase ? {
    id: studentCase.id,
    stage: studentCase.stage,
    targetDegreeLevel: studentCase.targetDegreeLevel,
    targetSubject: studentCase.targetSubject,
    preferredIntake: studentCase.preferredIntake,
    preferredRegions: studentCase.preferredRegions,
    preferredCountries: studentCase.preferredCountries,
    searchScope: studentCase.searchScope,
    academicBackgroundSummary: studentCase.academicBackgroundSummary,
    englishProficiencySummary: studentCase.englishProficiencySummary,
    fundingSummary: studentCase.fundingSummary,
    budgetMin: studentCase.budgetMin,
    budgetMax: studentCase.budgetMax,
    budgetCurrency: studentCase.budgetCurrency,
    studyLanguage: studentCase.studyLanguage,
    goals: studentCase.goals,
    constraints: studentCase.constraints,
    nextAction: studentCase.nextAction,
    humanHandoffActive: studentCase.humanHandoffActive,
  } : null;

  const context = {
    trustBoundary: "UNTRUSTED_REFERENCE_DATA_ONLY",
    student: profile ? { id: profile.id, user: profile.user } : null,
    studentCase: compactStudentCase,
    documents: compactDocuments,
    applications: compactApplications,
    checklists: compactChecklists,
    shortlists,
    serviceReferrals: compactReferrals,
    counselorSessions,
    commercialRules: {
      universityOrdering: "Among genuinely suitable choices, present active SOUP partners first, then suitable independent/public options. Never invent partner status.",
      insuranceTransactionChannel: "If Hellenic Sun Insurance Brokers / insuremart is active in partner data, insurance purchased through SOUP routes through that partner. Other insurers are advisory/external only.",
      visibleUniversityMatchPercentages: false,
    },
    catalogPolicy: {
      databaseFirst: true,
      catalogOptionCount: catalogUniversityOptions.length,
      liveResearchRule: "Use live search only for missing catalog coverage or time-sensitive verification. Reuse SOUP catalog facts when sufficiently current. Institutions listed in networkUniversitiesNeedingResearch are commercial network coverage only; never call them academically suitable until the requested program and current intake have been verified.",
    },
    catalogUniversityOptions,
    networkUniversitiesNeedingResearch,
    relevantSoupUniversityPartners: relevantUniversityPartners,
    activeSoupServicePartners: activeServicePartners,
  };

  return JSON.stringify(context).slice(0, 36_000);
}
