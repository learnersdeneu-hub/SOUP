import { beforeEach, describe, expect, it, vi } from "vitest";

// Covers the two risk areas in src/app/actions/activities.ts that aren't
// simple pass-through CRUD: the 10-activity cap (MAX_ACTIVITIES) and the
// position renumbering/reordering logic that keeps the list contiguous and
// orderable after an add/remove/reorder.

const prismaMock = vi.hoisted(() => ({
  studentActivity: {
    count: vi.fn(),
    create: vi.fn(async (_args: { data: Record<string, unknown> }) => ({})),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(async (_args: { where: { id: string }; data: { position: number } }) => ({})),
    deleteMany: vi.fn(async () => ({})),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  studentCase: { findUnique: vi.fn(async () => null), upsert: vi.fn(async (_args: { update: any; create: any }) => ({})) },
  $transaction: vi.fn(async (ops: unknown[]) => ops),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/currentUser", () => ({ requireProfile: vi.fn(async () => ({ profile: { id: "profile-A" }, user: { fullName: "Test Student" } })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { addActivity, removeActivity, reorderActivity } from "../../src/app/actions/activities";
import { MAX_ACTIVITIES } from "../../src/lib/applications/activityTypes";

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("addActivity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects adding an 11th activity", async () => {
    prismaMock.studentActivity.count.mockResolvedValue(MAX_ACTIVITIES);
    await expect(addActivity(form({ activityType: "Academic" }))).rejects.toThrow(`up to ${MAX_ACTIVITIES}`);
    expect(prismaMock.studentActivity.create).not.toHaveBeenCalled();
  });

  it("creates the activity at the next position and clears noActivitiesConfirmed", async () => {
    prismaMock.studentActivity.count.mockResolvedValue(3);
    await addActivity(form({ activityType: "Research", roleTitle: "Lab assistant" }));

    expect(prismaMock.studentActivity.create).toHaveBeenCalledTimes(1);
    const data = prismaMock.studentActivity.create.mock.calls[0][0].data;
    expect(data.position).toBe(3);
    expect(data.roleTitle).toBe("Lab assistant");
    expect(prismaMock.studentCase.upsert).toHaveBeenCalledTimes(1);
    expect(prismaMock.studentCase.upsert.mock.calls[0][0].update.extracurricularMeta.noActivitiesConfirmed).toBe(false);
  });

  it("clamps hoursPerWeek/weeksPerYear to their valid ranges", async () => {
    prismaMock.studentActivity.count.mockResolvedValue(0);
    await addActivity(form({ activityType: "Athletics (Club)", hoursPerWeek: "999", weeksPerYear: "-5" }));
    const data = prismaMock.studentActivity.create.mock.calls[0][0].data;
    expect(data.hoursPerWeek).toBe(168);
    expect(data.weeksPerYear).toBe(0);
  });
});

describe("removeActivity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renumbers the remaining activities contiguously after a deletion", async () => {
    prismaMock.studentActivity.findMany.mockResolvedValue([
      { id: "b", position: 1 },
      { id: "c", position: 2 },
    ]);
    await removeActivity(form({ id: "a" }));

    expect(prismaMock.studentActivity.deleteMany).toHaveBeenCalledWith({ where: { id: "a", profileId: "profile-A" } });
    const updates = prismaMock.$transaction.mock.calls[0][0] as Array<{ where: { id: string }; data: { position: number } }>;
    // The mocked update() calls above return promises directly (not real
    // Prisma promise objects), so we inspect what prisma.studentActivity.update
    // was called with for each renumbered row instead.
    expect(prismaMock.studentActivity.update).toHaveBeenNthCalledWith(1, { where: { id: "b" }, data: { position: 0 } });
    expect(prismaMock.studentActivity.update).toHaveBeenNthCalledWith(2, { where: { id: "c" }, data: { position: 1 } });
    expect(updates.length).toBe(2);
  });
});

describe("reorderActivity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("swaps positions with the previous activity when moving up", async () => {
    prismaMock.studentActivity.findMany.mockResolvedValue([
      { id: "a", position: 0 },
      { id: "b", position: 1 },
    ]);
    await reorderActivity(form({ id: "b", direction: "up" }));

    expect(prismaMock.studentActivity.update).toHaveBeenNthCalledWith(1, { where: { id: "b" }, data: { position: 0 } });
    expect(prismaMock.studentActivity.update).toHaveBeenNthCalledWith(2, { where: { id: "a" }, data: { position: 1 } });
  });

  it("does nothing when asked to move the first activity up", async () => {
    prismaMock.studentActivity.findMany.mockResolvedValue([
      { id: "a", position: 0 },
      { id: "b", position: 1 },
    ]);
    await reorderActivity(form({ id: "a", direction: "up" }));
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
