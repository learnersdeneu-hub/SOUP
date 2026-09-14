import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StudentApplicationStatus } from "@prisma/client";
import { APPLICATION_TRANSITIONS } from "../../src/lib/applications/statusPolicy";

const prismaMock = vi.hoisted(() => ({
  studentApplication: { findUnique: vi.fn() },
  studentApplicationEvent: { findFirst: vi.fn() },
  journeyChecklist: { findMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/apiStaff", () => ({ getApiStaff: vi.fn(async () => ({ user: { id: "staff-1" } })) }));
vi.mock("@/lib/journey/checklists", () => ({ isSupersededChecklist: vi.fn(() => false) }));
vi.mock("@/lib/notifications/email", () => ({ sendTransactionalEmail: vi.fn(async () => ({ ok: true })), escapeHtml: (value: string) => value }));
vi.mock("@/lib/notifications/preferences", () => ({ shouldSendStudentEmail: vi.fn(() => false) }));

import { POST } from "../../src/app/api/admin/applications/[id]/status/route";

const STATUSES: StudentApplicationStatus[] = [
  "SHORTLISTED", "DOCUMENTS_REQUIRED", "READY_TO_SUBMIT", "SUBMITTED", "UNDER_REVIEW",
  "OFFER_RECEIVED", "CONDITIONAL_OFFER", "REJECTED", "WITHDRAWN", "ENROLLED",
];

function application(status: StudentApplicationStatus) {
  return {
    id: "app-1",
    profileId: "profile-1",
    studentCaseId: "case-1",
    status,
    ownership: "SOUP_MANAGED",
    eligibilityStatus: "LIKELY_ELIGIBLE",
    applicationFeeStatus: "PAID",
    deadlineAt: new Date("2099-01-01T00:00:00Z"),
    assignedStaffUserId: null,
    submittedAt: null,
    offerDocumentId: "offer-doc-1",
    university: { name: "Test University" },
    program: { title: "Test Program" },
    profile: { communicationPreferences: null, user: { email: "student@example.test", fullName: "Student" } },
  };
}

function request(status: StudentApplicationStatus) {
  return new Request("http://localhost/api/admin/applications/app-1/status", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      status,
      externalReference: "REF-1",
      submissionEvidenceNote: "Submitted in the university portal.",
    }),
  });
}

describe("application status API transition behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.studentApplicationEvent.findFirst.mockResolvedValue({ id: "event-1", createdAt: new Date("2026-09-12T00:00:00Z") });
    prismaMock.journeyChecklist.findMany.mockResolvedValue([{ sourceSnapshot: {}, items: [] }]);
    prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn({
      studentApplication: { update: vi.fn(async ({ data }: { data: { status: StudentApplicationStatus } }) => ({ id: "app-1", status: data.status, updatedAt: new Date("2026-09-13T00:00:00Z") })) },
      studentApplicationEvent: { create: vi.fn(async () => ({})) },
      studentCase: { update: vi.fn(async () => ({})) },
      notification: { create: vi.fn(async () => ({})) },
    }));
  });

  for (const from of STATUSES) {
    for (const to of STATUSES) {
      if (from === to) continue;
      const valid = APPLICATION_TRANSITIONS[from].has(to);
      it(`${from} -> ${to} ${valid ? "succeeds" : "returns 409"}`, async () => {
        prismaMock.studentApplication.findUnique.mockResolvedValue(application(from));
        const response = await POST(request(to), { params: { id: "app-1" } });
        expect(response.status).toBe(valid ? 200 : 409);
      });
    }
  }
});
