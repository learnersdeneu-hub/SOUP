import { beforeEach, describe, expect, it, vi } from "vitest";

// Covers src/app/actions/recommenders.ts's validation and its one piece of
// non-trivial branching: resendInvite reuses a still-valid invite token
// rather than invalidating a link the recommender may already have open,
// and only mints a new one once the old one is missing or expired.

const prismaMock = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recommender: { create: vi.fn(async (_args: { data: any }) => ({})), findFirst: vi.fn(), update: vi.fn(async (args: { data: any }) => ({ id: "rec-1", email: "teacher@example.com", firstName: "Jane", lastName: "Doe", ...args.data })), deleteMany: vi.fn(async () => ({})) },
}));

const sendTransactionalEmailMock = vi.hoisted(() => vi.fn<() => Promise<{ sent: boolean; id?: string; reason?: string }>>(async () => ({ sent: true, id: "email-1" })));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/currentUser", () => ({ requireProfile: vi.fn(async () => ({ profile: { id: "profile-A" }, user: { fullName: "Test Student", email: "student@example.com" } })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/notifications/email", () => ({ sendTransactionalEmail: sendTransactionalEmailMock, escapeHtml: (value: string) => value }));
vi.mock("@/lib/applications/extracurricularMeta", () => ({ updateExtracurricularMeta: vi.fn(async () => ({})) }));

import { addRecommender, resendInvite, inviteRecommender } from "../../src/app/actions/recommenders";

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("addRecommender", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a missing name", async () => {
    const result = await addRecommender(form({ type: "TEACHER", firstName: "", lastName: "Doe", email: "a@b.com" }));
    expect(result).toEqual({ ok: false, error: "Enter the recommender's first and last name." });
    expect(prismaMock.recommender.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid email", async () => {
    const result = await addRecommender(form({ type: "TEACHER", firstName: "Jane", lastName: "Doe", email: "not-an-email" }));
    expect(result.ok).toBe(false);
    expect(prismaMock.recommender.create).not.toHaveBeenCalled();
  });

  it("creates the recommender and records the waiver timestamp when acknowledged", async () => {
    const result = await addRecommender(form({ type: "TEACHER", firstName: "Jane", lastName: "Doe", email: "jane@school.edu", waiverAcknowledged: "true" }));
    expect(result).toEqual({ ok: true });
    const data = prismaMock.recommender.create.mock.calls[0][0].data;
    expect(data.waiverAcknowledged).toBe(true);
    expect(data.waiverAcknowledgedAt).toBeInstanceOf(Date);
  });
});

describe("inviteRecommender", () => {
  beforeEach(() => vi.clearAllMocks());

  it("errors when the recommender doesn't belong to this profile", async () => {
    prismaMock.recommender.findFirst.mockResolvedValue(null);
    const result = await inviteRecommender(form({ id: "missing" }));
    expect(result).toEqual({ ok: false, error: "Recommender not found." });
  });

  it("errors without updating state when the email fails to send", async () => {
    prismaMock.recommender.findFirst.mockResolvedValue({ id: "rec-1", status: "NOT_INVITED", invitedAt: null });
    sendTransactionalEmailMock.mockResolvedValueOnce({ sent: false, reason: "PROVIDER_ERROR" });
    const result = await inviteRecommender(form({ id: "rec-1" }));
    expect(result.ok).toBe(false);
  });
});

describe("resendInvite", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reuses the existing token when it hasn't expired yet", async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    prismaMock.recommender.findFirst.mockResolvedValue({ id: "rec-1", status: "INVITED", inviteToken: "existing-token", inviteTokenExpiresAt: future, invitedAt: new Date() });

    await resendInvite(form({ id: "rec-1" }));

    const updateData = prismaMock.recommender.update.mock.calls[0][0].data;
    expect(updateData.inviteToken).toBe("existing-token");
    expect(updateData.inviteTokenExpiresAt).toBe(future);
  });

  it("mints a new token once the old one has expired", async () => {
    const past = new Date(Date.now() - 60 * 60 * 1000);
    prismaMock.recommender.findFirst.mockResolvedValue({ id: "rec-1", status: "INVITED", inviteToken: "stale-token", inviteTokenExpiresAt: past, invitedAt: new Date() });

    await resendInvite(form({ id: "rec-1" }));

    const updateData = prismaMock.recommender.update.mock.calls[0][0].data;
    expect(updateData.inviteToken).not.toBe("stale-token");
    expect(updateData.inviteTokenExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("refuses to resend once a letter has already been submitted", async () => {
    prismaMock.recommender.findFirst.mockResolvedValue({ id: "rec-1", status: "SUBMITTED", inviteToken: "t", inviteTokenExpiresAt: new Date(Date.now() + 1000) });
    const result = await resendInvite(form({ id: "rec-1" }));
    expect(result).toEqual({ ok: false, error: "This recommender has already submitted their letter." });
    expect(prismaMock.recommender.update).not.toHaveBeenCalled();
  });
});
