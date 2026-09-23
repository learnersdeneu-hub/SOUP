import { beforeEach, describe, expect, it, vi } from "vitest";

// Covers the "My Colleges" auto-satisfy behavior: a checklist item generated
// with a structured quantifiableMetric (ENGLISH_TEST_MIN) should be
// auto-completed when the student's saved test score meets it, or flagged
// with an explicit below-threshold message when it doesn't — never silently
// left as a generic unchecked task either way.

const prismaMock = vi.hoisted(() => ({
  studentCase: { findUnique: vi.fn() },
  journeyChecklistItem: { findMany: vi.fn(), update: vi.fn(async (_args: { where: { id: string }; data: { status?: string; metadata: Record<string, unknown> } }) => ({})) },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { reconcileCoreProfileWithChecklist } from "../../src/lib/journey/reconcileCoreProfile";

function ieltsItem(id: string, minScore: number, testType = "IELTS") {
  return { id, status: "ACTION_REQUIRED", metadata: { quantifiableMetric: "ENGLISH_TEST_MIN", quantifiableMinScore: minScore, quantifiableTestType: testType } };
}

describe("reconcileCoreProfileWithChecklist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("auto-completes an item when the saved score meets the threshold", async () => {
    prismaMock.studentCase.findUnique.mockResolvedValue({ testingDetails: { englishTestType: "IELTS", englishScore: "7.5" } });
    prismaMock.journeyChecklistItem.findMany.mockResolvedValue([ieltsItem("item-1", 7.0)]);

    await reconcileCoreProfileWithChecklist("profile-A");

    expect(prismaMock.journeyChecklistItem.update).toHaveBeenCalledTimes(1);
    const call = prismaMock.journeyChecklistItem.update.mock.calls[0][0];
    expect(call.where.id).toBe("item-1");
    expect(call.data.status).toBe("COMPLETE");
    expect(call.data.metadata.autoSatisfiedFromCoreProfile).toBe(true);
  });

  it("flags an item with an explicit message when the saved score is below the threshold", async () => {
    prismaMock.studentCase.findUnique.mockResolvedValue({ testingDetails: { englishTestType: "IELTS", englishScore: "6.5" } });
    prismaMock.journeyChecklistItem.findMany.mockResolvedValue([ieltsItem("item-2", 7.0)]);

    await reconcileCoreProfileWithChecklist("profile-A");

    const call = prismaMock.journeyChecklistItem.update.mock.calls[0][0];
    expect(call.data.status).toBeUndefined();
    expect(call.data.metadata.belowThreshold).toBe(true);
    expect(call.data.metadata.thresholdFlagMessage).toContain("6.5");
    expect(call.data.metadata.thresholdFlagMessage).toContain("7");
  });

  it("does nothing when the student has no test score on file yet", async () => {
    prismaMock.studentCase.findUnique.mockResolvedValue({ testingDetails: { englishTestType: "NONE_YET", englishScore: "" } });
    prismaMock.journeyChecklistItem.findMany.mockResolvedValue([ieltsItem("item-3", 7.0)]);

    await reconcileCoreProfileWithChecklist("profile-A");

    expect(prismaMock.journeyChecklistItem.update).not.toHaveBeenCalled();
  });

  it("skips items that aren't quantifiable requirements", async () => {
    prismaMock.studentCase.findUnique.mockResolvedValue({ testingDetails: { englishTestType: "IELTS", englishScore: "7.5" } });
    prismaMock.journeyChecklistItem.findMany.mockResolvedValue([{ id: "item-4", status: "ACTION_REQUIRED", metadata: { requiresDocument: true } }]);

    await reconcileCoreProfileWithChecklist("profile-A");

    expect(prismaMock.journeyChecklistItem.update).not.toHaveBeenCalled();
  });

  it("skips a mismatched test type instead of comparing scores across different tests", async () => {
    prismaMock.studentCase.findUnique.mockResolvedValue({ testingDetails: { englishTestType: "TOEFL", englishScore: "110" } });
    prismaMock.journeyChecklistItem.findMany.mockResolvedValue([ieltsItem("item-5", 7.0, "IELTS")]);

    await reconcileCoreProfileWithChecklist("profile-A");

    expect(prismaMock.journeyChecklistItem.update).not.toHaveBeenCalled();
  });
});
