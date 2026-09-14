import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GeminiProvider } from "../../src/lib/ai/providers/gemini";
import { AIProviderError } from "../../src/lib/ai/types";

const encoder = new TextEncoder();
const params = { system: "system", messages: [{ role: "user" as const, content: "hello" }] };

function sseResponse(events: string[], signal?: AbortSignal): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) controller.enqueue(encoder.encode(event));
      controller.close();
      signal?.addEventListener("abort", () => controller.error(new DOMException("Aborted", "AbortError")), { once: true });
    },
  });
  return new Response(stream, { status: 200, headers: { "content-type": "text/event-stream" } });
}

async function collect(provider: GeminiProvider, signal = new AbortController().signal) {
  const out = [];
  for await (const event of provider.streamChat(params, signal)) out.push(event);
  return out;
}

describe("GeminiProvider", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.AI_MODEL = "gemini-3.8-flash";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each([429, 500, 503])("retries retryable HTTP %s responses", async (status) => {
    vi.useFakeTimers();
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("retry", { status }))
      .mockResolvedValueOnce(sseResponse(['data: {"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}\n\n']));
    const provider = new GeminiProvider();
    const pending = collect(provider);
    await vi.runAllTimersAsync();
    const events = await pending;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(events.some((event) => event.type === "done")).toBe(true);
  });

  it("stops after the configured retry attempt limit", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("busy", { status: 503 }));
    const provider = new GeminiProvider();
    const pending = collect(provider).catch((error) => error);
    await vi.runAllTimersAsync();
    const error = await pending;
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(error).toBeInstanceOf(AIProviderError);
  });

  it("fails immediately for non-retryable HTTP responses", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("bad request", { status: 400 }));
    await expect(collect(new GeminiProvider())).rejects.toBeInstanceOf(AIProviderError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails fast on a quota-exhausted 429 instead of retrying (retrying cannot succeed and only burns more quota)", async () => {
    const quotaBody = JSON.stringify({ error: { code: 429, message: "You exceeded your current quota, please check your plan and billing details.", status: "RESOURCE_EXHAUSTED" } });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(quotaBody, { status: 429 }));
    const error = await collect(new GeminiProvider()).catch((e) => e);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(error).toBeInstanceOf(AIProviderError);
    expect(error.quotaExhausted).toBe(true);
    expect(error.retryable).toBe(true);
  });

  it("still retries a plain (non-quota) 429, unlike a quota-exhausted one", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 429, message: "Too many requests, please slow down." } }), { status: 429 }))
      .mockResolvedValueOnce(sseResponse(['data: {"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}\n\n']));
    const provider = new GeminiProvider();
    const pending = collect(provider);
    await vi.runAllTimersAsync();
    const events = await pending;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(events.some((event) => event.type === "done")).toBe(true);
  });

  it("throws AIProviderError for malformed SSE JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(sseResponse(["data: {not-json}\n\n"]));
    await expect(collect(new GeminiProvider())).rejects.toMatchObject({ name: "AIProviderError", message: "Gemini returned malformed stream data." });
  });

  it("respects AbortSignal cancellation during streaming", async () => {
    const controller = new AbortController();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      const signal = init?.signal as AbortSignal;
      let sent = false;
      const stream = new ReadableStream<Uint8Array>({
        pull(streamController) {
          if (!sent) {
            sent = true;
            streamController.enqueue(encoder.encode('data: {"candidates":[{"content":{"parts":[{"text":"first"}]}}]}\n\n'));
            return;
          }
        },
        start(streamController) {
          signal.addEventListener("abort", () => streamController.error(new DOMException("Aborted", "AbortError")), { once: true });
        },
      });
      return new Response(stream, { status: 200 });
    });

    const provider = new GeminiProvider();
    const iterator = provider.streamChat(params, controller.signal);
    await expect(iterator.next()).resolves.toMatchObject({ value: { type: "delta", text: "first" } });
    controller.abort();
    await expect(iterator.next()).rejects.toMatchObject({ name: "AIProviderError" });
  });
});
