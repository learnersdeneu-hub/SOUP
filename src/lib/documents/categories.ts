// Single source of truth for the category-specific document-upload boxes
// introduced across Profile & Details, Education Background, Testing,
// Funding and Extracurricular & Recommendations (see UploadBox.tsx and
// /api/documents/category-upload). Each key is stored verbatim as
// Document.documentType — several reuse the existing AI-classifier
// vocabulary in src/lib/journey/reconcile.ts's CLASS_ALIASES on purpose, so
// a document already uploaded through the old generic flow is recognised
// by the new boxes without re-uploading (see the migration notes in the
// Education Background phase). The rest are new classes, deliberately not
// reusing a generic one, to avoid a document silently satisfying the wrong
// degree level or writing box.
export type DocumentCategory =
  | "PASSPORT"
  | "HS_TRANSCRIPT"
  | "HS_DIPLOMA"
  | "BACHELORS_TRANSCRIPT"
  | "BACHELORS_DEGREE_CERTIFICATE"
  | "MASTERS_TRANSCRIPT"
  | "MASTERS_DEGREE_CERTIFICATE"
  | "RESUME_CV"
  | "ENGLISH_TEST"
  | "SAT_ACT_SCORE_REPORT"
  | "GRADUATE_TEST_SCORE_REPORT"
  | "BANK_STATEMENT"
  | "MOTIVATION_LETTER"
  | "PERSONAL_STATEMENT";

// HS_TRANSCRIPT is not its own Document.documentType — it reuses the
// existing A_LEVEL_TRANSCRIPT class exactly, so a transcript uploaded
// through the old Standard Documents flow already satisfies this box.
export const CATEGORY_DOCUMENT_TYPE: Record<DocumentCategory, string> = {
  PASSPORT: "PASSPORT",
  HS_TRANSCRIPT: "A_LEVEL_TRANSCRIPT",
  HS_DIPLOMA: "HS_DIPLOMA",
  BACHELORS_TRANSCRIPT: "BACHELORS_TRANSCRIPT",
  BACHELORS_DEGREE_CERTIFICATE: "BACHELORS_DEGREE_CERTIFICATE",
  MASTERS_TRANSCRIPT: "MASTERS_TRANSCRIPT",
  MASTERS_DEGREE_CERTIFICATE: "MASTERS_DEGREE_CERTIFICATE",
  RESUME_CV: "RESUME_CV",
  ENGLISH_TEST: "ENGLISH_TEST",
  SAT_ACT_SCORE_REPORT: "SAT_ACT_SCORE_REPORT",
  GRADUATE_TEST_SCORE_REPORT: "GRADUATE_TEST_SCORE_REPORT",
  BANK_STATEMENT: "BANK_STATEMENT",
  MOTIVATION_LETTER: "MOTIVATION_LETTER",
  PERSONAL_STATEMENT: "PERSONAL_STATEMENT",
};

const IMAGE_DOC_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"] as const;
const WRITING_UPLOAD_EXTENSIONS = ["pdf", "docx"] as const;

export const CATEGORY_CONFIG: Record<DocumentCategory, { label: string; extensions: readonly string[]; defaultMultiple: boolean }> = {
  PASSPORT: { label: "Passport", extensions: IMAGE_DOC_EXTENSIONS, defaultMultiple: false },
  HS_TRANSCRIPT: { label: "High school transcript", extensions: IMAGE_DOC_EXTENSIONS, defaultMultiple: true },
  HS_DIPLOMA: { label: "High school diploma / certificate", extensions: IMAGE_DOC_EXTENSIONS, defaultMultiple: true },
  BACHELORS_TRANSCRIPT: { label: "Bachelor's transcript", extensions: IMAGE_DOC_EXTENSIONS, defaultMultiple: true },
  BACHELORS_DEGREE_CERTIFICATE: { label: "Bachelor's degree certificate", extensions: IMAGE_DOC_EXTENSIONS, defaultMultiple: true },
  MASTERS_TRANSCRIPT: { label: "Master's transcript", extensions: IMAGE_DOC_EXTENSIONS, defaultMultiple: true },
  MASTERS_DEGREE_CERTIFICATE: { label: "Master's degree certificate", extensions: IMAGE_DOC_EXTENSIONS, defaultMultiple: true },
  RESUME_CV: { label: "Resume / CV", extensions: WRITING_UPLOAD_EXTENSIONS, defaultMultiple: false },
  ENGLISH_TEST: { label: "English test score report", extensions: IMAGE_DOC_EXTENSIONS, defaultMultiple: false },
  SAT_ACT_SCORE_REPORT: { label: "SAT/ACT score report", extensions: IMAGE_DOC_EXTENSIONS, defaultMultiple: false },
  GRADUATE_TEST_SCORE_REPORT: { label: "GRE/GMAT score report", extensions: IMAGE_DOC_EXTENSIONS, defaultMultiple: false },
  BANK_STATEMENT: { label: "Bank statement / proof of funds", extensions: IMAGE_DOC_EXTENSIONS, defaultMultiple: true },
  MOTIVATION_LETTER: { label: "Motivation letter", extensions: WRITING_UPLOAD_EXTENSIONS, defaultMultiple: false },
  PERSONAL_STATEMENT: { label: "Personal statement", extensions: WRITING_UPLOAD_EXTENSIONS, defaultMultiple: false },
};

export const DOCUMENT_CATEGORIES = Object.keys(CATEGORY_CONFIG) as DocumentCategory[];

export const MAX_CATEGORY_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB — see plan decision #3 (existing routes stay at 15MB)

const EXTENSION_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function isCategory(value: unknown): value is DocumentCategory {
  return typeof value === "string" && (DOCUMENT_CATEGORIES as string[]).includes(value);
}

export function allowedMimeTypesForCategory(category: DocumentCategory): Set<string> {
  return new Set(CATEGORY_CONFIG[category].extensions.map((ext) => EXTENSION_MIME[ext]));
}
