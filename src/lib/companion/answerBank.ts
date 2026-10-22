import { prisma } from "@/lib/prisma";

export type AnswerEntry = { value: string; source: string; confidence: "VERIFIED" | "PROFILE" | "STATED" };

export type AnswerBankResult = {
  profile: { fullName: string | null; email: string | null };
  answerBank: Record<string, AnswerEntry>;
  documentFacts: Array<{ field: string; value: string; sourceDocumentType: string; verified: boolean }>;
  documents: Array<{ id: string; documentType: string; originalFileName: string | null; reviewStatus: string; uploadedAt: Date }>;
  applications: Array<{ id: string; university: string | null; program: string | null; level: string | null; intake: string | null; status: string }>;
};

type UserFacts = {
  fullName: string | null;
  email: string | null;
  dateOfBirth: Date | null;
  nationality: string | null;
  currentCountry: string | null;
};

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] || "", lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

// Shared by the bearer-authenticated Companion API route (desktop app) and
// the session-authenticated web Companion page, so the two surfaces can
// never drift into reporting different answers for the same student. Only
// fields that genuinely exist in SOUP's own data model are ever returned —
// there is no "guessed" passport number, address or emergency contact.
// Anything not present simply never appears in the answer bank, which is the
// honest signal both panels use to ask the student directly instead of
// fabricating a value.
export async function buildAnswerBank(profileId: string, user: UserFacts): Promise<AnswerBankResult> {
  const [studentCase, applications, documents] = await Promise.all([
    prisma.studentCase.findUnique({ where: { profileId } }),
    prisma.studentApplication.findMany({
      where: { profileId, status: { notIn: ["WITHDRAWN", "REJECTED"] } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: { university: { select: { name: true } }, program: { select: { title: true, level: true } } },
    }),
    prisma.document.findMany({
      where: { profileId, processingStatus: "COMPLETE" },
      orderBy: { uploadedAt: "desc" },
      take: 20,
      select: { id: true, documentType: true, originalFileName: true, reviewStatus: true, uploadedAt: true, aiAnalysis: true },
    }),
  ]);

  const { firstName, lastName } = splitName(user.fullName || "");
  const answerBank: Record<string, AnswerEntry> = {};
  if (firstName) answerBank.firstName = { value: firstName, source: "SOUP profile", confidence: "PROFILE" };
  if (lastName) answerBank.lastName = { value: lastName, source: "SOUP profile", confidence: "PROFILE" };
  if (user.fullName) answerBank.fullName = { value: user.fullName, source: "SOUP profile", confidence: "PROFILE" };
  if (user.email) answerBank.email = { value: user.email, source: "SOUP profile", confidence: "PROFILE" };
  if (user.dateOfBirth) answerBank.dateOfBirth = { value: user.dateOfBirth.toISOString().slice(0, 10), source: "SOUP profile", confidence: "PROFILE" };
  if (user.nationality) answerBank.nationality = { value: user.nationality, source: "SOUP profile", confidence: "PROFILE" };
  if (user.currentCountry) answerBank.currentCountry = { value: user.currentCountry, source: "SOUP profile", confidence: "PROFILE" };
  if (studentCase?.targetDegreeLevel) answerBank.targetDegreeLevel = { value: studentCase.targetDegreeLevel, source: "SOUP counselor profile", confidence: "STATED" };
  if (studentCase?.targetSubject) answerBank.targetSubject = { value: studentCase.targetSubject, source: "SOUP counselor profile", confidence: "STATED" };
  if (studentCase?.preferredIntake) answerBank.preferredIntake = { value: studentCase.preferredIntake, source: "SOUP counselor profile", confidence: "STATED" };
  if (studentCase?.academicBackgroundSummary) answerBank.academicBackground = { value: studentCase.academicBackgroundSummary, source: "SOUP counselor profile", confidence: "STATED" };
  if (studentCase?.englishProficiencySummary) answerBank.englishProficiency = { value: studentCase.englishProficiencySummary, source: "SOUP counselor profile", confidence: "STATED" };

  // Facts genuinely extracted from a processed document (e.g. a passport scan)
  // are surfaced separately from the core answer bank, tagged with their real
  // source document, and clearly distinct from "SOUP profile" facts — both
  // panels must show "Extracted from your passport", never "Verified",
  // unless a human has actually reviewed it (reviewStatus === APPROVED).
  const documentFacts: AnswerBankResult["documentFacts"] = [];
  for (const document of documents) {
    const analysis = document.aiAnalysis && typeof document.aiAnalysis === "object" && !Array.isArray(document.aiAnalysis) ? document.aiAnalysis as Record<string, unknown> : {};
    const facts = Array.isArray(analysis.facts) ? analysis.facts : [];
    for (const fact of facts.slice(0, 12)) {
      if (!fact || typeof fact !== "object") continue;
      const field = String((fact as Record<string, unknown>).field || "").trim();
      const value = String((fact as Record<string, unknown>).value || "").trim();
      if (!field || !value) continue;
      documentFacts.push({ field, value: value.slice(0, 300), sourceDocumentType: document.documentType, verified: document.reviewStatus === "APPROVED" });
    }
    if (documentFacts.length > 80) break;
  }

  return {
    profile: { fullName: user.fullName, email: user.email },
    answerBank,
    documentFacts,
    documents: documents.map((d) => ({ id: d.id, documentType: d.documentType, originalFileName: d.originalFileName, reviewStatus: d.reviewStatus, uploadedAt: d.uploadedAt })),
    applications: applications.map((app) => ({ id: app.id, university: app.university?.name || null, program: app.program?.title || null, level: app.program?.level || null, intake: app.intake, status: app.status })),
  };
}
