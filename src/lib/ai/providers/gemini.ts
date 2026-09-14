import type { AIProvider, AIChatParams, AIStreamEvent, AISource } from "@/lib/ai/types";
import { AIConfigError, AIProviderError } from "@/lib/ai/types";

type GeminiChunk = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: {
      groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
    };
  }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { code?: number; message?: string; status?: string };
};

function retryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

// A 429 can mean two very different things: a brief per-request rate limit
// (worth a short backoff-and-retry) or an exhausted quota window (retrying
// immediately cannot succeed and only spends more of the same exhausted
// quota). Google's quota-exhaustion responses consistently say "quota" and/or
// carry a RESOURCE_EXHAUSTED status in the error body, so this is a
// conservative, false-positive-averse check rather than treating every 429
// as unretryable.
function isQuotaExhaustedError(status: number, detail: string): boolean {
  return status === 429 && /quota|RESOURCE_EXHAUSTED/i.test(detail);
}

function toGeminiContents(messages: AIChatParams["messages"]) {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private apiKey: string;
  private model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) throw new AIConfigError("GEMINI_API_KEY is not set.");
    this.apiKey = apiKey;
    this.model = process.env.AI_MODEL?.trim() || "gemini-3.8-flash";
  }

  async *streamChat(params: AIChatParams, signal: AbortSignal): AsyncGenerator<AIStreamEvent> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(this.apiKey)}`;
    const requestBody = JSON.stringify({
      systemInstruction: { parts: [{ text: params.system }] },
      contents: toGeminiContents(params.messages),
      generationConfig: {
        maxOutputTokens: params.maxTokens ?? 1024,
        ...(/^gemini-3\./i.test(this.model) ? { thinkingConfig: { thinkingLevel: params.thinkingLevel || "low" } } : {}),
      },
      ...(params.tools?.googleSearch || params.tools?.urlContext ? {
        tools: [
          ...(params.tools?.googleSearch ? [{ google_search: {} }] : []),
          ...(params.tools?.urlContext ? [{ url_context: {} }] : []),
        ],
      } : {}),
    });

    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: requestBody, signal });
      } catch (error) {
        if (signal.aborted) throw new AIProviderError("Gemini request was cancelled or timed out.", true, error);
        if (attempt === 2) throw new AIProviderError("Failed to start Gemini response stream.", true, error);
        await new Promise((resolve) => setTimeout(resolve, 350 * Math.pow(2, attempt)));
        continue;
      }
      if (response.ok) break;

      let detail = "";
      try { detail = await response.text(); } catch { /* ignore */ }
      const message = `Gemini request failed (${response.status}).${detail ? ` ${detail.slice(0, 300)}` : ""}`;
      // A quota-exhausted response fails fast regardless of remaining retry
      // attempts: immediately retrying the same request cannot succeed and
      // only spends more of the same exhausted quota. It is still reported
      // as `retryable` for user-messaging purposes, since retrying later
      // (once the quota window resets) genuinely can work.
      if (isQuotaExhaustedError(response.status, detail)) {
        throw new AIProviderError(message, true, undefined, true);
      }
      const retryable = retryableStatus(response.status);
      if (!retryable || attempt === 2) {
        throw new AIProviderError(message, retryable);
      }
      const retryAfterSeconds = Number(response.headers.get("retry-after") || "0");
      const backoffMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? Math.min(2_000, retryAfterSeconds * 1000)
        : 350 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      response = null;
    }

    if (!response) throw new AIProviderError("Gemini did not return a response.", true);
    if (!response.body) throw new AIProviderError("Gemini returned an empty response stream.", true);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";
    let inputTokens = 0;
    let outputTokens = 0;
    const sources = new Map<string, AISource>();

    const collectSources = (chunk: GeminiChunk) => {
      const grounding = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      for (const item of grounding) {
        const url = String(item.web?.uri || "").trim();
        if (!/^https?:\/\//i.test(url)) continue;
        const title = String(item.web?.title || "Source").trim().slice(0, 240) || "Source";
        if (!sources.has(url)) sources.set(url, { title, url });
      }
    };

    const processEvent = (raw: string): GeminiChunk | null => {
      const data = raw
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n");
      if (!data || data === "[DONE]") return null;
      try { return JSON.parse(data) as GeminiChunk; }
      catch (error) { throw new AIProviderError("Gemini returned malformed stream data.", true, error); }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? "";

        for (const raw of events) {
          const chunk = processEvent(raw);
          if (!chunk) continue;
          if (chunk.error) throw new AIProviderError(chunk.error.message || "Gemini could not complete the response.", false, chunk.error);
          collectSources(chunk);
          inputTokens = chunk.usageMetadata?.promptTokenCount ?? inputTokens;
          outputTokens = chunk.usageMetadata?.candidatesTokenCount ?? outputTokens;
          const text = chunk.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
          if (text) {
            fullText += text;
            yield { type: "delta", text };
          }
        }
        if (done) break;
      }

      if (buffer.trim()) {
        const chunk = processEvent(buffer);
        if (chunk) {
          collectSources(chunk);
          inputTokens = chunk.usageMetadata?.promptTokenCount ?? inputTokens;
          outputTokens = chunk.usageMetadata?.candidatesTokenCount ?? outputTokens;
          const text = chunk.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
          if (text) { fullText += text; yield { type: "delta", text }; }
        }
      }
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      throw new AIProviderError("Gemini response stream was interrupted.", true, error);
    } finally {
      reader.releaseLock();
    }

    yield { type: "done", fullText, usage: { inputTokens, outputTokens }, sources: [...sources.values()].slice(0, 12) };
  }
}
