import OpenAI from "openai";
import type { AIProvider, AIChatParams, AIStreamEvent } from "@/lib/ai/types";
import { AIConfigError, AIProviderError } from "@/lib/ai/types";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AIConfigError("OPENAI_API_KEY is not set.");
    }
    this.client = new OpenAI({ apiKey });
    this.model = process.env.AI_MODEL || "gpt-4o";
  }

  async *streamChat(params: AIChatParams, signal: AbortSignal): AsyncGenerator<AIStreamEvent> {
    let stream;
    try {
      stream = await this.client.chat.completions.create(
        {
          model: this.model,
          max_tokens: params.maxTokens ?? 1024,
          stream: true,
          stream_options: { include_usage: true },
          messages: [
            { role: "system", content: params.system },
            ...params.messages
              .filter((m) => m.role !== "system")
              .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          ],
        },
        { signal }
      );
    } catch (e) {
      throw new AIProviderError("Failed to start OpenAI stream.", true, e);
    }

    let fullText = "";
    let inputTokens = 0;
    let outputTokens = 0;
    try {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content;
        if (text) {
          fullText += text;
          yield { type: "delta", text };
        }
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens ?? inputTokens;
          outputTokens = chunk.usage.completion_tokens ?? outputTokens;
        }
      }
    } catch (e) {
      throw new AIProviderError("OpenAI stream failed mid-response.", true, e);
    }

    yield {
      type: "done",
      fullText,
      usage: { inputTokens, outputTokens },
    };
  }
}
