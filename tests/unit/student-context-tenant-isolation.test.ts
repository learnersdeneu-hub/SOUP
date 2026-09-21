import { beforeEach, describe, expect, it, vi } from "vitest";

// Regression coverage for a confirmed live incident: a signed-in student saw
// Noodles greet them with a different student's saved profile data (real
// name, real email, real checklist), and the same chat later showed a THIRD
// student's identity. The confirmed cause was the client keeping stale chat
// state across an account switch (fixed separately by keying
// ConversationWorkspace's parent components on the signed-in user id). This
// test covers the server side of the same class of bug: every Prisma call
// getStudentCounselorContext makes must be scoped to the exact profileId it
// was called with, so a future edit can never accidentally hardcode, reuse,
// or drop a profileId filter and pull one student's saved SOUP data into
// another student's Noodles conversation.

const prismaMock = vi.hoisted(() => ({
  profile: { findUnique: vi.fn(async (args: { where: { id: string } }) => ({ id: args.where.id, user: { email: `${args.where.id}@example.com`, fullName: `Student ${args.where.id}`, dateOfBirth: null, nationality: null, currentCountry: null } })) },
  studentCase: { findUnique: vi.fn(async (args: { where: { profileId: string } }) => ({ profileId: args.where.profileId, preferredCountries: [] })) },
  document: { findMany: vi.fn(async (args: { where: { profileId: string } }) => [{ id: `doc-${args.where.profileId}`, profileId: args.where.profileId }]) },
  studentApplication: { findMany: vi.fn(async (args: { where: { profileId: string } }) => [{ id: `app-${args.where.profileId}`, profileId: args.where.profileId, offerConditions: [] }]) },
  journeyChecklist: { findMany: vi.fn(async (args: { where: { profileId: string } }) => [{ id: `checklist-${args.where.profileId}`, profileId: args.where.profileId, items: [], sourceSnapshot: null }]) },
  universityShortlist: { findMany: vi.fn(async (args: { where: { profileId: string } }) => [{ id: `shortlist-${args.where.profileId}`, profileId: args.where.profileId, items: [] }]) },
  serviceReferral: { findMany: vi.fn(async (args: { where: { profileId: string } }) => [{ id: `referral-${args.where.profileId}`, profileId: args.where.profileId, partnerId: null, partner: null }]) },
  counselorSession: { findMany: vi.fn(async (args: { where: { profileId: string } }) => [{ id: `session-${args.where.profileId}`, profileId: args.where.profileId }]) },
  university: { findMany: vi.fn(async () => [] as unknown[]) },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/partners/relevance", () => ({
  getRelevantUniversityPartners: vi.fn(async () => []),
  getActiveServicePartners: vi.fn(async () => []),
}));

import { getStudentCounselorContext } from "../../src/lib/context/studentContext";

// Prisma calls that take a `where: { profileId }` shape and must always be
// scoped to the profileId under test.
const PROFILE_SCOPED_CALLS: Array<keyof typeof prismaMock> = [
  "studentCase", "document", "studentApplication", "journeyChecklist", "universityShortlist", "serviceReferral", "counselorSession",
];

describe("getStudentCounselorContext tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes every per-student query to the exact profileId argument, never another profile's", async () => {
    await getStudentCounselorContext("profile-A");

    expect(prismaMock.profile.findUnique.mock.calls[0][0].where).toEqual({ id: "profile-A" });
    for (const model of PROFILE_SCOPED_CALLS) {
      const mockFn = (prismaMock[model] as { findMany?: ReturnType<typeof vi.fn>; findUnique?: ReturnType<typeof vi.fn> }).findMany
        || (prismaMock[model] as { findUnique?: ReturnType<typeof vi.fn> }).findUnique;
      expect(mockFn).toHaveBeenCalled();
      const calledWhere = mockFn!.mock.calls[0][0].where;
      expect(calledWhere.profileId).toBe("profile-A");
    }
  });

  it("produces independently-scoped queries and independent saved-context output for two different profiles, with no cross-contamination", async () => {
    const contextA = await getStudentCounselorContext("profile-A");
    vi.clearAllMocks();
    const contextB = await getStudentCounselorContext("profile-B");

    for (const model of PROFILE_SCOPED_CALLS) {
      const mockFn = (prismaMock[model] as { findMany?: ReturnType<typeof vi.fn>; findUnique?: ReturnType<typeof vi.fn> }).findMany
        || (prismaMock[model] as { findUnique?: ReturnType<typeof vi.fn> }).findUnique;
      const calledWhere = mockFn!.mock.calls[0][0].where;
      expect(calledWhere.profileId).toBe("profile-B");
      expect(calledWhere.profileId).not.toBe("profile-A");
    }

    // The two students' saved-context JSON payloads must never share the
    // other's identity-bearing content (email, generated document/
    // application/checklist ids, all derived from the mocked profileId).
    expect(contextA).toContain("profile-A@example.com");
    expect(contextA).not.toContain("profile-B@example.com");
    expect(contextB).toContain("profile-B@example.com");
    expect(contextB).not.toContain("profile-A@example.com");
    expect(contextA).not.toContain("doc-profile-B");
    expect(contextB).not.toContain("doc-profile-A");
  });
});
