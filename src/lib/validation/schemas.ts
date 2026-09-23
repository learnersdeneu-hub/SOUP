import { z } from "zod";
import { idSchema, optionalIdSchema, optionalShortTextSchema, shortTextSchema } from "@/lib/validation/http";

export const dismissDocumentRequestSchema = z.object({
  sessionId: optionalIdSchema,
  documentLabel: shortTextSchema(200).min(1),
}).strict();

export const startApplicationSchema = z.object({
  // Optional: present when starting from an AI-generated shortlist recommendation.
  // Absent for a Direct Application started by the student without going through
  // Noodles — both paths create the same StudentApplication record.
  shortlistItemId: optionalIdSchema,
  universityId: idSchema,
  programId: optionalIdSchema,
  intake: optionalShortTextSchema(160),
  // Direct Application only: a student-typed subject (e.g. "Computer Science")
  // used when the university has no verified program rows on file. Recorded
  // honestly as an unverified student-stated interest — never treated as a
  // real UniversityProgram or as verified program data.
  intendedSubjectNote: optionalShortTextSchema(160),
}).strict();

export const applicationApproveSchema = z.object({
  declarationAccepted: z.boolean().optional().default(false),
}).strict();

export const applicationWithdrawSchema = z.object({
  reason: optionalShortTextSchema(1200),
}).strict();

export const journeyItemStatusSchema = z.object({
  itemId: idSchema,
  status: z.enum(["ACTION_REQUIRED", "COMPLETE", "NOT_APPLICABLE"]),
}).strict();

export const attachJourneyDocumentSchema = z.object({
  documentId: idSchema,
  requestedLabel: optionalShortTextSchema(500),
  checklistItemId: optionalShortTextSchema(191),
  applicationId: optionalShortTextSchema(191),
}).strict();

export const serviceReferralSchema = z.object({
  type: z.enum(["ACCOMMODATION", "STUDENT_FINANCE", "INSURANCE", "SCHOLARSHIP"]),
  partnerId: optionalIdSchema,
  notes: optionalShortTextSchema(2000),
}).strict();

export const insuranceStartSchema = z.object({
  destination: optionalShortTextSchema(160),
  purpose: optionalShortTextSchema(240),
  coverageStart: optionalShortTextSchema(40),
  coverageEnd: optionalShortTextSchema(40),
  concerns: optionalShortTextSchema(2000),
}).strict();

export const conversationSessionCreateSchema = z.object({
  workflow: z.string().trim().min(1).max(80).optional(),
  title: optionalShortTextSchema(160),
}).strict();

export const conversationSessionRenameSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(160),
}).strict();

export const conversationSessionDeleteSchema = z.object({ id: idSchema }).strict();

export const conversationMessageSchema = z.object({
  sessionId: idSchema.optional(),
  role: z.enum(["user", "assistant"]).default("user"),
  content: z.string().trim().min(1).max(12000),
  workflow: z.string().trim().max(80).optional(),
}).strict();

export const conversationStreamSchema = z.object({
  sessionId: idSchema.optional(),
  workflow: z.string().trim().max(80).optional(),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(12000),
  }).strict()).max(80).default([]),
}).strict();

export const paymentVerifyQuerySchema = z.object({
  session_id: z.string().trim().min(1).max(512),
});

export const conversationHistorySchema = z.object({
  workflow: z.enum(["RESUME", "COUNSELOR"]),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(12000),
    metadata: z.object({
      sources: z.array(z.object({ title: z.string().max(240), url: z.string().max(1200) }).strict()).max(12).optional(),
    }).partial().optional(),
  }).strict()).max(80).default([]),
}).strict();

export const conversationHistoryResetSchema = z.object({
  workflow: z.enum(["RESUME", "COUNSELOR"]),
}).strict();

export const adminApplicationFactsSchema = z.object({
  applicationFeeStatus: z.enum(["UNKNOWN", "NOT_REQUIRED", "REQUIRED", "STUDENT_PAYING", "SOUP_PAYING", "PENDING", "PAID", "WAIVED", "REFUNDED"]).optional(),
  eligibilityStatus: z.enum(["NOT_CHECKED", "LIKELY_ELIGIBLE", "NEEDS_REVIEW", "NOT_ELIGIBLE"]).optional(),
  applicationFeeAmount: z.union([z.number().nonnegative(), z.string().trim().max(64), z.null()]).optional(),
  applicationFeeCurrency: z.string().trim().max(3).optional().nullable(),
  reason: optionalShortTextSchema(1500),
}).strict();

export const adminApplicationStatusSchema = z.object({
  status: z.enum(["SHORTLISTED", "DOCUMENTS_REQUIRED", "READY_TO_SUBMIT", "SUBMITTED", "UNDER_REVIEW", "OFFER_RECEIVED", "CONDITIONAL_OFFER", "REJECTED", "WITHDRAWN", "ENROLLED"]),
  externalReference: optionalShortTextSchema(300),
  notes: optionalShortTextSchema(3000),
  submissionEvidenceUrl: optionalShortTextSchema(1500),
  submissionEvidenceNote: optionalShortTextSchema(1500),
}).strict();

export const adminRequirementStatusSchema = z.object({
  status: z.enum(["WAITING_FOR_DOCUMENT", "DOCUMENT_UPLOADED", "COMPLETE", "NOT_APPLICABLE", "BLOCKED", "ACTION_REQUIRED"]),
  note: optionalShortTextSchema(1200),
}).strict();

export const adminRequirementsRefreshSchema = z.object({
  refresh: z.boolean().optional().default(false),
}).strict();

export const insuranceStartRequestSchema = z.object({
  source: optionalShortTextSchema(120),
}).strict();

export const partnerReferralStartSchema = z.object({
  partnerId: idSchema,
  source: optionalShortTextSchema(120),
}).strict();

export const resumeQuestionnaireSchema = z.object({
  template: z.enum(["STUDENT", "GRADUATE", "PROFESSIONAL", "INTERNATIONAL_STUDENT", "JOB_SEEKER"]),
  targetRole: z.string().transform((value) => value.trim().slice(0, 160)).refine((value) => value.length > 0),
  goal: z.string().trim().max(600).default(""),
  fullName: z.string().trim().min(1).max(160),
  email: z.string().trim().min(1).max(240),
  phone: z.string().trim().max(80).default(""),
  location: z.string().trim().max(160).default(""),
  linkedin: z.string().trim().max(300).default(""),
  portfolio: z.string().trim().max(300).default(""),
  education: z.string().trim().max(6000).default(""),
  experience: z.string().trim().max(8000).default(""),
  projects: z.string().trim().max(5000).default(""),
  skills: z.string().trim().max(3000).default(""),
  achievements: z.string().trim().max(4000).default(""),
  certifications: z.string().trim().max(3000).default(""),
  languages: z.string().trim().max(2000).default(""),
  additionalContext: z.string().trim().max(4000).default(""),
}).strict().refine((value) => Boolean(value.education || value.experience), { message: "Add at least your education or experience." });

export const resumeConversationGenerateSchema = z.object({
  sessionId: optionalIdSchema,
  importedResume: z.object({ content: z.unknown().optional() }).passthrough().optional(),
}).strict();

export const counselorApplicationPlanSchema = z.object({
  sessionId: optionalIdSchema,
}).strict();

export const counselorChecklistSchema = z.object({
  kind: z.enum(["VISA", "PRE_DEPARTURE"]).optional().default("VISA"),
  sessionId: optionalIdSchema,
}).strict();

export const conversationPersistMessageSchema = z.object({
  sessionId: idSchema,
  metadata: z.record(z.unknown()).optional(),
}).strict();

export const counselorConversationStreamSchema = z.object({
  sessionId: optionalIdSchema,
  workflow: z.enum(["COUNSELOR", "RESUME"]).optional().default("COUNSELOR"),
  entryIntent: optionalShortTextSchema(160),
  entryUniversityId: optionalIdSchema,
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(12000),
  }).strict()).max(80).default([]),
}).strict();

export const applicationRequirementsResearchSchema = z.object({
  title: z.unknown().optional(),
  primarySourceUrl: z.unknown().optional(),
  sourceNotes: z.array(z.unknown()).optional().default([]),
  programFacts: z.object({
    intake: z.unknown().optional(),
    applicationDeadline: z.unknown().optional(),
    applicationFeeAmount: z.unknown().optional(),
    applicationFeeCurrency: z.unknown().optional(),
    applicationFeeStatus: z.unknown().optional(),
    eligibilityStatus: z.unknown().optional(),
    eligibilityReason: z.unknown().optional(),
  }).passthrough().optional().default({}),
  items: z.array(z.object({
    title: z.unknown().optional(),
    description: z.unknown().optional(),
    required: z.unknown().optional(),
    requiresDocument: z.unknown().optional(),
    documentClass: z.unknown().optional(),
    externalActionUrl: z.unknown().optional(),
    externalActionLabel: z.unknown().optional(),
    responsibleParty: z.unknown().optional(),
    approvalBlocking: z.unknown().optional(),
    // Only present when this requirement is a quantifiable test-score
    // minimum (e.g. "IELTS 7.0 overall") — lets the server compare it
    // against the student's saved core-profile test score and auto-satisfy
    // or flag it, instead of leaving every such item as a manual task. See
    // reconcileCoreProfileWithChecklist.
    quantifiableMetric: z.unknown().optional(),
    quantifiableTestType: z.unknown().optional(),
    quantifiableMinScore: z.unknown().optional(),
  }).passthrough()).optional().default([]),
}).passthrough();

export const counselorApplicationPlanResearchSchema = z.object({
  title: z.unknown().optional(),
  regionScope: z.unknown().optional(),
  studentSummary: z.unknown().optional(),
  researchNotes: z.array(z.unknown()).optional().default([]),
  recommendations: z.array(z.object({
    universityName: z.unknown().optional(),
    country: z.unknown().optional(),
    city: z.unknown().optional(),
    programTitle: z.unknown().optional(),
    level: z.unknown().optional(),
    field: z.unknown().optional(),
    studyMode: z.unknown().optional(),
    language: z.unknown().optional(),
    duration: z.unknown().optional(),
    tuitionAmount: z.unknown().optional(),
    tuitionCurrency: z.unknown().optional(),
    intake: z.unknown().optional(),
    applicationDeadline: z.unknown().optional(),
    eligibilityStatus: z.unknown().optional(),
    whyItFits: z.unknown().optional(),
    requirementsSummary: z.unknown().optional(),
    cautions: z.array(z.unknown()).optional().default([]),
    officialUniversityUrl: z.unknown().optional(),
    officialProgramUrl: z.unknown().optional(),
    applicationUrl: z.unknown().optional(),
  }).passthrough()).optional().default([]),
}).passthrough();

export const counselorChecklistResearchSchema = z.object({
  title: z.unknown().optional(),
  destinationCountry: z.unknown().optional(),
  authorityName: z.unknown().optional(),
  sourceUrl: z.unknown().optional(),
  sourceNotes: z.array(z.unknown()).optional().default([]),
  items: z.array(z.object({
    title: z.unknown().optional(),
    description: z.unknown().optional(),
    required: z.unknown().optional(),
    requiresDocument: z.unknown().optional(),
    documentClass: z.unknown().optional(),
    externalActionUrl: z.unknown().optional(),
    externalActionLabel: z.unknown().optional(),
  }).passthrough()).optional().default([]),
}).passthrough();


// Shared request-input schemas for query/form-data endpoints. Keep API validation here so
// request contracts remain discoverable and route behavior stays consistent.

export const conversationHistoryQuerySchema = z.object({
  workflow: z.enum(["RESUME", "COUNSELOR"]),
}).strict();

export const conversationSessionQuerySchema = z.object({
  id: optionalIdSchema,
}).strict();

export const exportByIdQuerySchema = z.object({
  id: optionalIdSchema,
}).strict();

export const exportDocumentQuerySchema = z.object({
  id: optionalIdSchema,
  format: z.string().optional().default("pdf"),
}).strict();
export const resumeExportQuerySchema = z.object({
  id: optionalIdSchema,
  format: z.string().optional().default("pdf"),
}).strict();


export const adminOfferUploadSchema = z.object({
  file: z.unknown(),
  conditional: z.string().optional().default("false"),
}).strict();

export const evidenceProcessFormSchema = z.object({
  file: z.unknown(),
  workflow: z.enum(["COUNSELOR", "RESUME"]).optional().default("COUNSELOR"),
}).strict();

export const premiumCheckoutFormSchema = z.object({
  plan: z.enum(["premium", "premium_plus"]).optional().default("premium"),
}).strict();

export const resumeImportFormSchema = z.object({
  file: z.unknown(),
  template: z.enum(["STUDENT", "GRADUATE", "PROFESSIONAL", "INTERNATIONAL_STUDENT", "JOB_SEEKER"]).optional().default("JOB_SEEKER"),
  targetRole: z.string().transform((value) => value.trim().slice(0, 160)).refine((value) => value.length > 0),
}).strict();

export const companionPairSchema = z.object({
  code: z.string().trim().min(4).max(32),
  deviceLabel: optionalShortTextSchema(120),
}).strict();

export const companionFillEventSchema = z.object({
  portalHost: z.string().trim().min(1).max(255),
  pageUrl: z.string().trim().min(1).max(2000),
  fieldsDetected: z.number().int().min(0).max(5000),
  fieldsFilled: z.number().int().min(0).max(5000),
  fieldsNeedInput: z.number().int().min(0).max(5000),
  outcome: z.enum(["COMPLETED", "PARTIAL", "NEEDS_INPUT", "ERROR"]).optional().default("COMPLETED"),
}).strict();

export const stripeSignatureSchema = z.string().trim().min(1).max(4096);

export const stripeWebhookEventSchema = z.object({
  type: z.string().trim().min(1).max(160),
  data: z.object({ object: z.record(z.unknown()) }).passthrough(),
}).passthrough();
