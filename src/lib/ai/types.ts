// Provider-neutral types for the AI layer. The pilot uses Gemini while the rest
// of the app stays decoupled from the provider implementation.

export type AIRole = "system" | "user" | "assistant";

export type AIMessage = {
  role: AIRole;
  content: string;
};

export type AIStreamDelta = {
  type: "delta";
  text: string;
};

export type AIStreamDone = {
  type: "done";
  fullText: string;
  usage: { inputTokens: number; outputTokens: number };
  sources?: AISource[];
};

export type AISource = {
  title: string;
  url: string;
};

export type AIStreamEvent = AIStreamDelta | AIStreamDone;

export type AIChatParams = {
  system: string;
  messages: AIMessage[];
  maxTokens?: number;
  thinkingLevel?: "low" | "medium" | "high";
  tools?: { googleSearch?: boolean; urlContext?: boolean };
};

export interface AIProvider {
  readonly name: string;
  streamChat(params: AIChatParams, signal: AbortSignal): AsyncGenerator<AIStreamEvent>;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
    public readonly cause?: unknown,
    // Set when the provider reported the request failed specifically because
    // an API quota/rate limit was exhausted (as opposed to a generic
    // transient failure). Callers use this to avoid immediately retrying or
    // running a second attempt against the same exhausted quota, which can
    // only fail again and wastes the little quota headroom that remains.
    public readonly quotaExhausted: boolean = false
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

export class AIConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIConfigError";
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public readonly retryAfterMs: number) {
    super(message);
    this.name = "RateLimitError";
  }
}


export function publicAIErrorMessage(error: unknown): string {
  if (error instanceof AIConfigError) {
    return "Noodles is not configured yet. Please contact support or try again later.";
  }
  return "Noodles is temporarily unavailable. Please try again.";
}
