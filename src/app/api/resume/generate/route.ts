import { AIConfigError, AIProviderError } from "@/lib/ai/types";
import { aiRateLimitResponse } from "@/lib/ai/httpRateLimit";
import { generateResumeFromSource } from "@/lib/resume/ai";
import type { ResumeQuestionnaire } from "@/lib/resume/types";
import { parseJsonBody } from "@/lib/validation/http";
import { resumeQuestionnaireSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = await aiRateLimitResponse(request, null);
  if (limited) return limited;
  const parsed = await parseJsonBody(request, resumeQuestionnaireSchema);
  if (!parsed.ok) return parsed.response;
  const answers: ResumeQuestionnaire = parsed.data;
  try { return Response.json(await generateResumeFromSource({ kind: "questionnaire", answers }, answers.template)); }
  catch (e) {
    if (e instanceof AIConfigError) return Response.json({ error: "SOUP Intelligence is not configured yet. Please try again after AI setup is complete." }, { status: 503 });
    const message = e instanceof AIProviderError ? "SOUP Intelligence could not prepare the resume. Please try again." : e instanceof Error ? e.message : "Resume generation failed.";
    return Response.json({ error: message }, { status: 502 });
  }
}
