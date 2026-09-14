import { beforeEach, describe, expect, it, vi } from "vitest";

const txMock = {
  chatSession: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(async () => ({})),
    findUniqueOrThrow: vi.fn(),
  },
  chatMessage: { createMany: vi.fn(async () => ({ count: 0 })) },
};

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/apiUser", () => ({
  requireApiProfile: vi.fn(async () => ({ ok: true, profile: { id: "profile-1" } })),
}));

import { POST } from "../../src/app/api/conversation/history/route";

function request(body: unknown) {
  return new Request("http://localhost/api/conversation/history", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const REAL_TRANSCRIPT = [
  { id: "m-user-1", role: "USER", content: "hi", metadata: null, createdAt: new Date("2026-09-13T00:00:00Z") },
  { id: "m-assistant-1", role: "ASSISTANT", content: "reply", metadata: null, createdAt: new Date("2026-09-13T00:00:01Z") },
];

describe("conversation history reconciliation (duplicate greeting regression)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof txMock) => unknown) => fn(txMock));
  });

  it("does not fork or re-persist the session when only a leading greeting differs from saved history", async () => {
    txMock.chatSession.findFirst.mockResolvedValue({ id: "session-A", messages: REAL_TRANSCRIPT });
    txMock.chatSession.findUniqueOrThrow.mockResolvedValue({ id: "session-A", messages: REAL_TRANSCRIPT });

    const response = await POST(request({
      workflow: "COUNSELOR",
      messages: [
        { role: "assistant", content: "Tell me what you need help with. I can stay with you from university search through applications, documents, visa preparation and pre-departure." },
        { role: "user", content: "hi" },
        { role: "assistant", content: "reply" },
      ],
    }));
    const body = await response.json();

    expect(txMock.chatSession.update).not.toHaveBeenCalled();
    expect(txMock.chatSession.create).not.toHaveBeenCalled();
    expect(txMock.chatMessage.createMany).not.toHaveBeenCalled();
    expect(body.sessionId).toBe("session-A");
    expect(body.messages).toHaveLength(2);
    expect(body.messages.some((message: { content: string }) => message.content.includes("Tell me what you need help with"))).toBe(false);
  });

  it("still forks when the student's actual messages genuinely diverge", async () => {
    txMock.chatSession.findFirst.mockResolvedValue({ id: "session-A", messages: REAL_TRANSCRIPT });
    txMock.chatSession.create.mockResolvedValue({ id: "session-B", messages: [] });
    txMock.chatSession.findUniqueOrThrow.mockResolvedValue({
      id: "session-B",
      messages: [{ id: "m-guest-1", role: "USER", content: "a totally different message", metadata: { source: "GUEST_IMPORT" }, createdAt: new Date("2026-09-13T01:00:00Z") }],
    });

    const response = await POST(request({
      workflow: "COUNSELOR",
      messages: [{ role: "user", content: "a totally different message" }],
    }));
    const body = await response.json();

    expect(txMock.chatSession.update).toHaveBeenCalledWith({ where: { id: "session-A" }, data: expect.objectContaining({ status: "COMPLETED" }) });
    expect(txMock.chatSession.create).toHaveBeenCalledTimes(1);
    expect(txMock.chatMessage.createMany).toHaveBeenCalledTimes(1);
    expect(body.sessionId).toBe("session-B");
    expect(body.messages).toHaveLength(1);
  });

  it("never persists a lone greeting for a brand-new session with no real messages", async () => {
    txMock.chatSession.findFirst.mockResolvedValue(null);
    txMock.chatSession.create.mockResolvedValue({ id: "session-new", messages: [] });
    txMock.chatSession.findUniqueOrThrow.mockResolvedValue({ id: "session-new", messages: [] });

    const response = await POST(request({ workflow: "COUNSELOR", messages: [] }));
    const body = await response.json();

    expect(txMock.chatSession.create).toHaveBeenCalledTimes(1);
    expect(txMock.chatMessage.createMany).not.toHaveBeenCalled();
    expect(body.sessionId).toBe("session-new");
    expect(body.messages).toHaveLength(0);
  });
});
