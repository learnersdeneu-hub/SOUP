import type { AIProvider } from "@/lib/ai/types";
import { GeminiProvider } from "@/lib/ai/providers/gemini";
import { OpenAIProvider } from "@/lib/ai/providers/openai";
import { AIConfigError } from "@/lib/ai/types";

// Pilot default: Gemini. OpenAI remains available for a later production switch
// without coupling the rest of GCI to either provider.
let cached: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cached) return cached;
  const configured = (process.env.AI_PROVIDER || "gemini").trim().toLowerCase();
  if (configured === "gemini") cached = new GeminiProvider();
  else if (configured === "openai") cached = new OpenAIProvider();
  else throw new AIConfigError(`Unsupported AI_PROVIDER=${configured}. Use gemini or openai.`);
  return cached;
}
