import { prisma } from "@/lib/prisma";
import { isSupersededChecklist } from "@/lib/journey/checklists";

const CLASS_ALIASES: Record<string, string[]> = {
  PASSPORT: ["passport", "travel document"],
  O_LEVEL_CERTIFICATE: ["o level", "olevel", "secondary certificate", "secondary school certificate"],
  A_LEVEL_TRANSCRIPT: ["a level", "alevel", "higher secondary", "high school transcript"],
  DEGREE_CERTIFICATE: ["degree certificate", "diploma", "graduation certificate"],
  ACADEMIC_TRANSCRIPT: ["academic transcript", "transcript", "marksheet", "mark sheet"],
  ENGLISH_TEST: ["ielts", "toefl", "pte", "english language", "english test", "language evidence"],
  OFFER_LETTER: ["offer letter", "admission letter", "acceptance letter", "letter of admission", "university offer"],
  BANK_STATEMENT: ["bank statement", "financial evidence", "proof of funds", "funds evidence"],
  ACCOMMODATION_CONFIRMATION: ["accommodation", "housing confirmation", "tenancy", "booking confirmation"],
  INSURANCE_CERTIFICATE: ["insurance", "insurance certificate", "health insurance", "travel insurance"],
  VISA_FORM: ["visa form", "visa application form", "application form"],
  ATTESTATION: ["attestation", "legalization", "legalisation", "apostille", "mofa"],
  MOTIVATION_LETTER: ["motivation letter", "statement of purpose", "sop"],
  REFERENCE_LETTER: ["reference letter", "recommendation letter", "letter of recommendation", "academic reference", "professional reference"],
  // Added for the Extracurricular & Recommendations / per-section document
  // uploads (src/app/profile/education, /testing, /extracurricular). Kept
  // degree-level-specific rather than reusing ACADEMIC_TRANSCRIPT /
  // DEGREE_CERTIFICATE so a bachelor's-level document can never silently
  // satisfy a master's-level requirement or vice versa.
  HS_DIPLOMA: ["high school diploma", "secondary school diploma", "o level certificate", "a level certificate"],
  BACHELORS_TRANSCRIPT: ["bachelor transcript", "bachelors transcript", "undergraduate transcript"],
  BACHELORS_DEGREE_CERTIFICATE: ["bachelor degree certificate", "bachelors degree certificate", "undergraduate degree certificate", "bachelor diploma"],
  MASTERS_TRANSCRIPT: ["master transcript", "masters transcript", "graduate transcript"],
  MASTERS_DEGREE_CERTIFICATE: ["master degree certificate", "masters degree certificate", "graduate degree certificate", "master diploma"],
  SAT_ACT_SCORE_REPORT: ["sat score report", "act score report", "sat report", "act report"],
  GRADUATE_TEST_SCORE_REPORT: ["gre score report", "gmat score report", "gre report", "gmat report"],
  RESUME_CV: ["resume", "cv", "curriculum vitae"],
  PERSONAL_STATEMENT: ["personal statement"],
};


const AUTO_REUSABLE_CLASSES = new Set([
  "PASSPORT",
  "O_LEVEL_CERTIFICATE",
  "A_LEVEL_TRANSCRIPT",
  "DEGREE_CERTIFICATE",
  "ACADEMIC_TRANSCRIPT",
  "ENGLISH_TEST",
  "HS_DIPLOMA",
  "BACHELORS_TRANSCRIPT",
  "BACHELORS_DEGREE_CERTIFICATE",
  "MASTERS_TRANSCRIPT",
  "MASTERS_DEGREE_CERTIFICATE",
  "SAT_ACT_SCORE_REPORT",
  "GRADUATE_TEST_SCORE_REPORT",
  "RESUME_CV",
  "PERSONAL_STATEMENT",
]);

function normalize(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function reconcileDocumentWithJourney(profileId: string, documentId: string, documentClass: string) {
  const normalizedClass = String(documentClass || "").toUpperCase();
  // Only stable, generally reusable identity/academic evidence may satisfy
  // multiple open requirements automatically. Application-specific or
  // freshness-sensitive documents must be linked to the exact case explicitly.
  if (!AUTO_REUSABLE_CLASSES.has(normalizedClass)) return [];
  const aliases = CLASS_ALIASES[normalizedClass] || [documentClass];
  const normalizedAliases = aliases.map(normalize).filter(Boolean);
  if (!normalizedAliases.length) return [];

  const items = await prisma.journeyChecklistItem.findMany({
    where: {
      checklist: { profileId },
      status: { in: ["WAITING_FOR_DOCUMENT", "ACTION_REQUIRED", "NOT_STARTED"] },
    },
    include: { checklist: { select: { applicationId: true, kind: true, sourceSnapshot: true } } },
    orderBy: { updatedAt: "desc" },
    take: 240,
  });
  const matches = items.filter((item) => {
    if (isSupersededChecklist(item.checklist.sourceSnapshot)) return false;
    const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
      ? item.metadata as Record<string, unknown>
      : {};
    const expectedClass = String(metadata.documentClass || "").toUpperCase();
    if (expectedClass) return expectedClass === normalizedClass;
    const haystack = normalize(`${item.title} ${item.description || ""}`);
    return normalizedAliases.some((alias) => haystack.includes(alias) || alias.includes(normalize(item.title)));
  });
  if (!matches.length) return [];

  await prisma.$transaction(matches.map((item) => {
    const existingMetadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
      ? item.metadata as Record<string, unknown>
      : {};
    return prisma.journeyChecklistItem.update({
      where: { id: item.id },
      data: {
        documentId,
        status: "DOCUMENT_UPLOADED",
        metadata: { ...existingMetadata, documentLinkedAt: new Date().toISOString(), documentClass, authorityApproved: false },
      },
    });
  }));

  const applicationMatches = matches.filter((item) => item.checklist.kind === "ADMISSION" && item.checklist.applicationId);
  for (const item of applicationMatches) {
    const applicationId = item.checklist.applicationId!;
    await prisma.studentApplicationDocument.upsert({
      where: { applicationId_documentId: { applicationId, documentId } },
      create: { applicationId, documentId, documentRole: item.title.slice(0, 300), required: item.required },
      update: { documentRole: item.title.slice(0, 300), required: item.required },
    }).catch(() => undefined);
  }
  return matches.map((item) => item.id);
}
