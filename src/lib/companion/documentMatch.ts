import { prisma } from "@/lib/prisma";
import { CATEGORY_DOCUMENT_TYPE, type DocumentCategory } from "@/lib/documents/categories";

export type MatchedDocument = {
  id: string;
  originalFileName: string | null;
  uploadedAt: Date;
  reviewStatus: string;
};

export type DocumentMatchResult =
  | { category: DocumentCategory; outcome: "SINGLE_MATCH"; document: MatchedDocument }
  | { category: DocumentCategory; outcome: "AMBIGUOUS"; documents: MatchedDocument[] }
  | { category: DocumentCategory; outcome: "NO_MATCH" };

// Keyword hints a portal's own field label commonly uses, mapped to the SOUP
// document category that satisfies it. A category like ENGLISH_TEST covers
// several underlying test types (IELTS/TOEFL/PTE/Duolingo) on purpose — the
// disambiguation between which uploaded document to use happens afterwards,
// against the student's own vault (see matchDocumentsForCategory), not here.
const CATEGORY_HINTS: Array<{ category: DocumentCategory; keywords: string[] }> = [
  { category: "PASSPORT", keywords: ["passport"] },
  { category: "ENGLISH_TEST", keywords: ["ielts", "toefl", "pte academic", "duolingo", "english proficiency", "english test", "english language"] },
  { category: "SAT_ACT_SCORE_REPORT", keywords: ["sat score", "act score", "sat/act"] },
  { category: "GRADUATE_TEST_SCORE_REPORT", keywords: ["gre", "gmat"] },
  { category: "BACHELORS_DEGREE_CERTIFICATE", keywords: ["bachelor's degree", "bachelors degree", "undergraduate degree certificate", "bachelor degree certificate"] },
  { category: "BACHELORS_TRANSCRIPT", keywords: ["bachelor's transcript", "bachelors transcript", "undergraduate transcript"] },
  { category: "MASTERS_DEGREE_CERTIFICATE", keywords: ["master's degree", "masters degree", "graduate degree certificate"] },
  { category: "MASTERS_TRANSCRIPT", keywords: ["master's transcript", "masters transcript", "graduate transcript"] },
  { category: "HS_DIPLOMA", keywords: ["high school diploma", "secondary school certificate", "hs diploma"] },
  { category: "HS_TRANSCRIPT", keywords: ["high school transcript", "a-level transcript", "secondary school transcript"] },
  { category: "RESUME_CV", keywords: ["resume", "cv", "curriculum vitae"] },
  { category: "BANK_STATEMENT", keywords: ["bank statement", "proof of funds", "financial statement"] },
  { category: "MOTIVATION_LETTER", keywords: ["motivation letter", "letter of motivation"] },
  { category: "PERSONAL_STATEMENT", keywords: ["personal statement", "statement of purpose"] },
];

export function detectDocumentCategory(fieldLabel: string): DocumentCategory | null {
  const normalized = fieldLabel.toLowerCase();
  for (const hint of CATEGORY_HINTS) {
    if (hint.keywords.some((keyword) => normalized.includes(keyword))) return hint.category;
  }
  return null;
}

export async function matchDocumentsForCategory(profileId: string, category: DocumentCategory): Promise<DocumentMatchResult> {
  const documentType = CATEGORY_DOCUMENT_TYPE[category];
  const documents = await prisma.document.findMany({
    where: { profileId, documentType, processingStatus: "COMPLETE" },
    orderBy: { uploadedAt: "desc" },
    select: { id: true, originalFileName: true, uploadedAt: true, reviewStatus: true },
  });
  if (documents.length === 0) return { category, outcome: "NO_MATCH" };
  if (documents.length === 1) return { category, outcome: "SINGLE_MATCH", document: documents[0] };
  return { category, outcome: "AMBIGUOUS", documents };
}
