import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  profile: { findUnique: vi.fn() },
  studentCase: { upsert: vi.fn(async () => ({})), findUnique: vi.fn(async () => null) },
  document: { findMany: vi.fn(async () => []) },
  studentApplication: { findMany: vi.fn(async () => []) },
  journeyChecklist: { findMany: vi.fn(async () => []) },
  universityShortlist: { findMany: vi.fn(async () => []) },
  serviceReferral: { findMany: vi.fn(async () => []) },
  counselorSession: { findMany: vi.fn(async () => []) },
  university: { findMany: vi.fn(async () => []) },
  chatSession: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  chatMessage: { create: vi.fn(), findMany: vi.fn() },
}));

const authMock = vi.hoisted(() => ({ getUser: vi.fn() }));
const checkRateLimitMock = vi.hoisted(() => vi.fn(async () => undefined));
const streamChatMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: () => ({ auth: authMock }) }));
vi.mock("@/lib/ai/rateLimiter", () => ({ checkRateLimit: checkRateLimitMock }));
vi.mock("@/lib/ai/registry", () => ({ getAIProvider: vi.fn(() => ({ name: "test", streamChat: streamChatMock })) }));
vi.mock("@/lib/partners/relevance", () => ({
  getRelevantUniversityPartners: vi.fn(async () => []),
  getActiveServicePartners: vi.fn(async () => []),
}));
vi.mock("@/lib/journey/checklists", () => ({ isSupersededChecklist: vi.fn(() => false) }));

import { POST } from "../../src/app/api/conversation/stream/route";
import { AIProviderError } from "../../src/lib/ai/types";

function request(body: unknown) {
  return new Request("http://localhost/api/conversation/stream", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("conversation stream route error hardening (regression for intermittent \"Noodles could not respond\")", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimitMock.mockResolvedValue(undefined);
  });

  it("returns a structured JSON error instead of an uncaught crash when the auth/profile lookup fails", async () => {
    authMock.getUser.mockRejectedValue(new Error("supabase unavailable"));
    const response = await POST(request({ workflow: "COUNSELOR", messages: [{ role: "user", content: "hi" }] }));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("returns a structured JSON error when the rate-limit check throws an unexpected (non-RateLimitError) error", async () => {
    authMock.getUser.mockResolvedValue({ data: { user: null } });
    checkRateLimitMock.mockRejectedValueOnce(new Error("db down"));
    const response = await POST(request({ workflow: "COUNSELOR", messages: [{ role: "user", content: "hi" }] }));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
  });

  it("returns a structured JSON error when session/message setup throws for a signed-in profile", async () => {
    authMock.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    prismaMock.profile.findUnique.mockResolvedValue({ id: "profile-1" });
    prismaMock.chatSession.findFirst.mockRejectedValue(new Error("db exploded"));
    const response = await POST(request({ workflow: "COUNSELOR", messages: [{ role: "user", content: "hi" }] }));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
  });

  it("never lets an unexpected error escape as a non-JSON response for a guest request", async () => {
    authMock.getUser.mockResolvedValue({ data: { user: null } });
    checkRateLimitMock.mockRejectedValueOnce(new Error("unexpected"));
    const response = await POST(request({ workflow: "COUNSELOR", messages: [{ role: "user", content: "hi" }] }));
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toBeTruthy();
  });

  it("gives Noodles enough output token headroom for thinking + a full visible reply (regression: too-tight a budget produced empty/truncated replies)", async () => {
    authMock.getUser.mockResolvedValue({ data: { user: null } });
    // eslint-disable-next-line require-yield
    streamChatMock.mockImplementation(async function* () {
      throw new AIProviderError("stop after capturing params", false);
    });
    await POST(request({ workflow: "COUNSELOR", messages: [{ role: "user", content: "hi" }] }));
    expect(streamChatMock.mock.calls[0][0].maxTokens).toBeGreaterThanOrEqual(2048);

    streamChatMock.mockClear();
    await POST(request({ workflow: "RESUME", messages: [{ role: "user", content: "hi" }] }));
    expect(streamChatMock.mock.calls[0][0].maxTokens).toBeGreaterThanOrEqual(1536);
  });

  it("does not attempt a second (fallback) AI call when the primary failure is quota-exhausted", async () => {
    authMock.getUser.mockResolvedValue({ data: { user: null } });
    const quotaError = new AIProviderError("Gemini request failed (429). quota exceeded", true, undefined, true);
    // eslint-disable-next-line require-yield
    streamChatMock.mockImplementation(async function* () {
      throw quotaError;
    });
    // "tuition" is a live-fact research cue, so web research (and therefore a
    // fallback attempt without it) would normally be enabled for this message.
    const response = await POST(request({ workflow: "COUNSELOR", messages: [{ role: "user", content: "What is the tuition fee?" }] }));
    const body = await response.text();
    expect(streamChatMock).toHaveBeenCalledTimes(1);
    expect(body).toContain("was interrupted");
  });
});
