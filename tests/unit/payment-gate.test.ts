import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  payment: { findFirst: vi.fn() },
  profile: { findUnique: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/navigation", () => ({ redirect: vi.fn((url: string) => { throw new Error(`REDIRECT ${url}`); }) }));

import { assertSubmissionAccess, hasSubmissionAccess, isGateExempt, paymentRequiredResponse, PAYMENT_REQUIRED_HEADER } from "../../src/lib/payments/access";
import { bankTransferReady, invoiceNumberFor } from "../../src/lib/payments/bankTransfer";

beforeEach(() => {
  prismaMock.payment.findFirst.mockReset();
  prismaMock.profile.findUnique.mockReset();
});

describe("payment gate", () => {
  it("never gates staff or admin accounts", async () => {
    for (const role of ["COUNSELOR", "ADMISSIONS", "FINANCE", "ACCOMMODATION", "SUPPORT", "ADMIN", "SUPER_ADMIN"] as const) {
      expect(isGateExempt(role)).toBe(true);
      expect(await hasSubmissionAccess("p1", role)).toBe(true);
    }
    expect(prismaMock.payment.findFirst).not.toHaveBeenCalled();
  });

  it("gates a student until a SOUP Scholar/Concierge payment is PAID", async () => {
    expect(isGateExempt("CUSTOMER")).toBe(false);
    prismaMock.payment.findFirst.mockResolvedValueOnce(null);
    expect(await hasSubmissionAccess("p1", "CUSTOMER")).toBe(false);
    prismaMock.payment.findFirst.mockResolvedValueOnce({ id: "pay1" });
    expect(await hasSubmissionAccess("p1", "CUSTOMER")).toBe(true);
    expect(prismaMock.payment.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { profileId: "p1", type: "PREMIUM_COUNSELING", status: "PAID" },
    }));
  });

  it("answers 402 with the watcher header for an unpaid student", async () => {
    prismaMock.payment.findFirst.mockResolvedValueOnce(null);
    const response = await paymentRequiredResponse("p1", "CUSTOMER");
    expect(response?.status).toBe(402);
    expect(response?.headers.get(PAYMENT_REQUIRED_HEADER)).toBe("1");
    expect((await response!.json()).code).toBe("PAYMENT_REQUIRED");
  });

  it("looks the role up when a caller doesn't pass it", async () => {
    prismaMock.profile.findUnique.mockResolvedValueOnce({ user: { role: "ADMIN" } });
    expect(await paymentRequiredResponse("p1")).toBeNull();
  });

  it("server actions send an unpaid student to Payments", async () => {
    prismaMock.payment.findFirst.mockResolvedValueOnce(null);
    await expect(assertSubmissionAccess("p1", "CUSTOMER")).rejects.toThrow("REDIRECT /payments?required=1#invoice");
  });
});

describe("bank transfer invoices", () => {
  it("builds a readable, unique invoice number", () => {
    expect(invoiceNumberFor("4f2a9c1e-0000-4000-8000-000000000000", new Date("2026-11-18T10:00:00Z"))).toBe("SOUP-INV-20261118-4F2A9C");
  });

  it("refuses to issue invoices until bank details and the PKR amount are set", () => {
    expect(bankTransferReady()).toBe(false);
  });
});

// Regression guard: every route/action that uploads or submits on a
// student's behalf must keep calling the gate.
describe("gated entry points", () => {
  const gated: Array<[string, string]> = [
    ["src/app/api/documents/category-upload/route.ts", "paymentRequiredResponse"],
    ["src/app/api/applications/[id]/requirements/[itemId]/upload/route.ts", "paymentRequiredResponse"],
    ["src/app/api/applications/[id]/approve/route.ts", "paymentRequiredResponse"],
    ["src/app/api/evidence/process/route.ts", "paymentRequiredResponse"],
    ["src/app/api/resume/import/route.ts", "paymentRequiredResponse"],
    ["src/app/api/services/insurance/start/route.ts", "paymentRequiredResponse"],
    ["src/app/api/services/referral/start/route.ts", "paymentRequiredResponse"],
    ["src/app/api/companion/pairing-code/route.ts", "paymentRequiredResponse"],
    ["src/app/api/companion/pdf/fill/route.ts", "paymentRequiredResponse"],
    ["src/app/api/companion/applications/[id]/approve/route.ts", "paymentRequiredResponse"],
    ["src/app/actions/documents.ts", "assertSubmissionAccess"],
    ["src/app/actions/credentials.ts", "assertSubmissionAccess"],
    ["src/app/actions/referrals.ts", "assertSubmissionAccess"],
  ];
  it.each(gated)("%s calls the payment gate", (file, fn) => {
    expect(fs.readFileSync(path.resolve(file), "utf8")).toContain(`${fn}(`);
  });
});
