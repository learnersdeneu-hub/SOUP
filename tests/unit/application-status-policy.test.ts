import { describe, expect, it } from "vitest";
import type { StudentApplicationStatus } from "@prisma/client";
import { APPLICATION_TRANSITIONS, canTransitionApplication, submissionGuardError } from "../../src/lib/applications/statusPolicy";

const STATUSES: StudentApplicationStatus[] = [
  "SHORTLISTED", "DOCUMENTS_REQUIRED", "READY_TO_SUBMIT", "SUBMITTED", "UNDER_REVIEW",
  "OFFER_RECEIVED", "CONDITIONAL_OFFER", "REJECTED", "WITHDRAWN", "ENROLLED",
];

describe("application status state machine", () => {
  for (const from of STATUSES) {
    for (const to of STATUSES) {
      const expected = APPLICATION_TRANSITIONS[from].has(to);
      it(`${from} -> ${to} is ${expected ? "allowed" : "rejected"}`, () => {
        expect(canTransitionApplication(from, to)).toBe(expected);
      });
    }
  }
});

const validSubmission = {
  studentApprovalValid: true,
  eligibilityStatus: "LIKELY_ELIGIBLE",
  applicationFeeStatus: "PAID" as const,
  deadlineAt: new Date("2099-01-01T00:00:00Z"),
  now: new Date("2026-09-13T00:00:00Z"),
  externalReference: "APP-123",
  hasSubmissionEvidence: true,
  hasCurrentChecklist: true,
  incompleteRequiredItems: 0,
};

describe("submission preconditions", () => {
  it("accepts a fully ready submission", () => {
    expect(submissionGuardError(validSubmission)).toBeNull();
  });

  it.each([
    ["student approval", { studentApprovalValid: false }],
    ["eligibility", { eligibilityStatus: "NEEDS_REVIEW" }],
    ["fee status", { applicationFeeStatus: "PENDING" as const }],
    ["deadline", { deadlineAt: new Date("2026-09-12T00:00:00Z") }],
    ["reference", { externalReference: "" }],
    ["submission evidence", { hasSubmissionEvidence: false }],
    ["official checklist", { hasCurrentChecklist: false }],
    ["required checklist completion", { incompleteRequiredItems: 2 }],
  ])("blocks when %s is unmet", (_label, override) => {
    expect(submissionGuardError({ ...validSubmission, ...override })).toBeTruthy();
  });

  it.each(["UNKNOWN", "REQUIRED", "PENDING"] as const)("blocks unresolved fee state %s", (applicationFeeStatus) => {
    expect(submissionGuardError({ ...validSubmission, applicationFeeStatus })).toContain("fee status");
  });

  it.each(["NOT_REQUIRED", "STUDENT_PAYING", "SOUP_PAYING", "PAID", "WAIVED", "REFUNDED"] as const)("accepts non-blocking fee state %s", (applicationFeeStatus) => {
    expect(submissionGuardError({ ...validSubmission, applicationFeeStatus })).toBeNull();
  });
});
