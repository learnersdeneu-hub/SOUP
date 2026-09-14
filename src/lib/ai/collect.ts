import { jsonrepair } from "jsonrepair";
import { getAIProvider } from "@/lib/ai/registry";
import type { AIMessage, AISource } from "@/lib/ai/types";

export async function collectAIResult({ system, messages, maxTokens = 1600, timeoutMs = 45_000, tools }: { system: string; messages: AIMessage[]; maxTokens?: number; timeoutMs?: number; tools?: { googleSearch?: boolean; urlContext?: boolean } }) {
  const provider = getAIProvider();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let fullText = "";
  let sources: AISource[] = [];
  try {
    for await (const event of provider.streamChat({ system, messages, maxTokens, tools }, controller.signal)) {
      if (event.type === "delta") fullText += event.text;
      if (event.type === "done") {
        if (event.fullText) fullText = event.fullText;
        if (Array.isArray(event.sources)) sources = event.sources;
      }
    }
    return { text: fullText.trim(), sources };
  } finally {
    clearTimeout(timeout);
  }
}

export async function collectAIText(args: Parameters<typeof collectAIResult>[0]) {
  return (await collectAIResult(args)).text;
}

export function parseJSONObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = (fenced || text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI returned invalid structured data.");
  const jsonText = candidate.slice(start, end + 1);
  try {
    return JSON.parse(jsonText);
  } catch {
    return JSON.parse(jsonrepair(jsonText));
  }
}
