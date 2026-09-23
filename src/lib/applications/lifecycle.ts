import type { ChecklistItemStatus, DocumentReviewStatus, EvidenceProcessingStatus, StudentApplicationStatus } from "@prisma/client";

// "My Colleges" cap (Common App-style): fixed at 3 for every student, not a
// plan-tier limit. Applies only to SOUP_MANAGED applications — see
// /api/applications POST and the /colleges page, both of which import this
// single constant rather than each hardcoding the number.
export const MY_COLLEGES_CAP = 3;

export type ApplicationLike = {
  status: StudentApplicationStatus | string;
  ownership?: string | null;
  deadlineAt?: Date | string | null;
  applicationFeeStatus?: string | null;
  eligibilityStatus?: string | null;
  studentApprovedAt?: Date | string | null;
  submittedAt?: Date | string | null;
  externalReference?: string | null;
};

export type RequirementLike = {
  title: string;
  required: boolean;
  status: ChecklistItemStatus | string;
  metadata?: unknown;
  dueAt?: Date | string | null;
  document?: {
    reviewStatus?: DocumentReviewStatus | string | null;
    processingStatus?: EvidenceProcessingStatus | string | null;
    validUntil?: Date | string | null;
  } | null;
};

function meta(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function applicationKey(profileId: string, universityId: string, programId: string | null, intake?: string | null) {
  const normalizedIntake = String(intake || "unspecified").trim().toLowerCase().replace(/\s+/g, "-").slice(0, 100);
  return `${profileId}:${programId || `university-${universityId}`}:${normalizedIntake}`;
}

export function deadlineUrgency(deadlineAt?: Date | string | null, now = new Date()) {
  if (!deadlineAt) return { level: "UNKNOWN" as const, days: null as number | null, label: "Deadline not confirmed" };
  const date = deadlineAt instanceof Date ? deadlineAt : new Date(deadlineAt);
  if (Number.isNaN(date.getTime())) return { level: "UNKNOWN" as const, days: null as number | null, label: "Deadline not confirmed" };
  const days = Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return { level: "CLOSED" as const, days, label: "Deadline passed" };
  if (days <= 7) return { level: "CRITICAL" as const, days, label: `${days} day${days === 1 ? "" : "s"} left · critical` };
  if (days <= 14) return { level: "URGENT" as const, days, label: `${days} days left · urgent` };
  if (days <= 30) return { level: "PRIORITY" as const, days, label: `${days} days left · priority` };
  return { level: "NORMAL" as const, days, label: `${days} days left` };
}

export function requirementOwner(item: RequirementLike) {
  const m = meta(item.metadata);
  const raw = String(m.responsibleParty || "STUDENT").toUpperCase();
  if (["SOUP", "UNIVERSITY", "THIRD_PARTY"].includes(raw)) return raw as "SOUP" | "UNIVERSITY" | "THIRD_PARTY";
  return "STUDENT" as const;
}

export function requiresDocument(item: RequirementLike) {
  return meta(item.metadata).requiresDocument === true || item.status === "WAITING_FOR_DOCUMENT" || item.status === "DOCUMENT_UPLOADED";
}

export function documentIsSubmissionReady(item: RequirementLike, now = new Date()) {
  if (!requiresDocument(item)) return true;
  if (!item.document) return false;
  if (item.document.processingStatus !== "COMPLETE") return false;
  if (item.document.reviewStatus !== "APPROVED") return false;
  if (item.document.validUntil) {
    const expiry = item.document.validUntil instanceof Date ? item.document.validUntil : new Date(item.document.validUntil);
    if (!Number.isNaN(expiry.getTime()) && expiry.getTime() < now.getTime()) return false;
  }
  return true;
}

export function requirementCompleteForSubmission(item: RequirementLike) {
  if (!item.required || item.status === "NOT_APPLICABLE") return true;
  if (requirementOwner(item) === "STUDENT" && requiresDocument(item)) return ["DOCUMENT_UPLOADED", "COMPLETE"].includes(String(item.status)) && documentIsSubmissionReady(item);
  return item.status === "COMPLETE";
}

export function nextApplicationAction(application: ApplicationLike, items: RequirementLike[], missingCore: string[] = []) {
  const status = String(application.status);
  if (status === "WITHDRAWN") return { owner: "NONE", text: "This application has been withdrawn." };
  if (status === "REJECTED") return { owner: "COUNSELOR", text: "Review the decision with SOUP and choose the strongest remaining option." };
  if (["OFFER_RECEIVED", "CONDITIONAL_OFFER"].includes(status)) return { owner: "STUDENT", text: "Review the offer, conditions, deposit and acceptance deadline with SOUP." };
  if (["SUBMITTED", "UNDER_REVIEW"].includes(status)) return { owner: "UNIVERSITY", text: "No action required unless the university or SOUP requests an update." };
  if (missingCore.length) return { owner: "STUDENT", text: `Complete ${missingCore[0]}.` };

  const studentPending = items.find((item) => item.required && requirementOwner(item) === "STUDENT" && !requirementCompleteForSubmission(item));
  if (studentPending) {
    if (requiresDocument(studentPending) && studentPending.document && studentPending.document.reviewStatus !== "APPROVED") {
      return { owner: "SOUP", text: `SOUP is reviewing your ${studentPending.title}. No duplicate upload is needed unless replacement is requested.` };
    }
    return { owner: "STUDENT", text: `${requiresDocument(studentPending) ? "Upload or replace" : "Complete"} ${studentPending.title}.` };
  }

  const soupPending = items.find((item) => item.required && requirementOwner(item) === "SOUP" && !requirementCompleteForSubmission(item));
  if (status === "READY_TO_SUBMIT" || application.studentApprovedAt) {
    return soupPending ? { owner: "SOUP", text: `SOUP is completing ${soupPending.title}.` } : { owner: "SOUP", text: "SOUP is completing final submission checks. No student action is required." };
  }

  if (String(application.applicationFeeStatus) === "REQUIRED" || String(application.applicationFeeStatus) === "PENDING") {
    return { owner: "STUDENT", text: "Complete the application fee step before submission." };
  }
  return { owner: "STUDENT", text: "Review the completed application file and approve it for SOUP submission." };
}

export function sourceFreshness(checkedAt?: Date | string | null, maxAgeDays = 30, now = new Date()) {
  if (!checkedAt) return { fresh: false, ageDays: null as number | null };
  const checked = checkedAt instanceof Date ? checkedAt : new Date(checkedAt);
  if (Number.isNaN(checked.getTime())) return { fresh: false, ageDays: null as number | null };
  const ageDays = Math.floor((now.getTime() - checked.getTime()) / 86_400_000);
  return { fresh: ageDays <= maxAgeDays, ageDays };
}
