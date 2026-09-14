import type { ApplicationFeeStatus, StudentApplicationStatus } from "@prisma/client";

export const APPLICATION_TRANSITIONS: Readonly<Record<StudentApplicationStatus, ReadonlySet<StudentApplicationStatus>>> = {
  SHORTLISTED: new Set(["DOCUMENTS_REQUIRED", "WITHDRAWN"]),
  DOCUMENTS_REQUIRED: new Set(["READY_TO_SUBMIT", "REJECTED", "WITHDRAWN"]),
  READY_TO_SUBMIT: new Set(["DOCUMENTS_REQUIRED", "SUBMITTED", "WITHDRAWN"]),
  SUBMITTED: new Set(["UNDER_REVIEW", "OFFER_RECEIVED", "CONDITIONAL_OFFER", "REJECTED", "WITHDRAWN"]),
  UNDER_REVIEW: new Set(["OFFER_RECEIVED", "CONDITIONAL_OFFER", "REJECTED", "WITHDRAWN"]),
  CONDITIONAL_OFFER: new Set(["OFFER_RECEIVED", "ENROLLED", "WITHDRAWN"]),
  OFFER_RECEIVED: new Set(["ENROLLED", "WITHDRAWN"]),
  REJECTED: new Set(),
  WITHDRAWN: new Set(),
  ENROLLED: new Set(),
};

export function canTransitionApplication(from: StudentApplicationStatus, to: StudentApplicationStatus): boolean {
  return APPLICATION_TRANSITIONS[from].has(to);
}

export type SubmissionGuardInput = {
  studentApprovalValid: boolean;
  eligibilityStatus: string;
  applicationFeeStatus: ApplicationFeeStatus;
  deadlineAt: Date | null;
  now?: Date;
  externalReference?: string;
  hasSubmissionEvidence: boolean;
  hasCurrentChecklist: boolean;
  incompleteRequiredItems: number;
};

export function submissionGuardError(input: SubmissionGuardInput): string | null {
  if (!input.studentApprovalValid) return "The student must review and approve the current application file before it can enter final submission or submitted status.";
  if (input.eligibilityStatus !== "LIKELY_ELIGIBLE") return "Eligibility must be source-checked and resolved before submission.";
  if (["UNKNOWN", "REQUIRED", "PENDING"].includes(input.applicationFeeStatus)) return "Resolve the application fee status (paid, waived, or not required) before submission.";
  if (input.deadlineAt && input.deadlineAt.getTime() < (input.now ?? new Date()).getTime()) return "The recorded application deadline has passed. Verify a valid later intake/deadline before submission.";
  if (!input.externalReference?.trim()) return "Enter the university/application reference number before marking this application submitted.";
  if (!input.hasSubmissionEvidence) return "Record submission evidence (confirmation URL/reference note) before marking this application submitted.";
  if (!input.hasCurrentChecklist) return "Prepare the official application requirements before marking this application submitted.";
  if (input.incompleteRequiredItems > 0) return `${input.incompleteRequiredItems} required application item${input.incompleteRequiredItems === 1 ? " is" : "s are"} still incomplete. Admissions must complete the SOUP application file before submission.`;
  return null;
}
