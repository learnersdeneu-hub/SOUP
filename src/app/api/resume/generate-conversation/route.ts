import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/logging/safe";
import { generateResumeFromConversation } from "@/lib/resume/ai";
import { AIConfigError } from "@/lib/ai/types";
import { refreshCustomerContext } from "@/lib/context/customerContext";
import { aiRateLimitResponse } from "@/lib/ai/httpRateLimit";
import { buildTrustedAIConversationMessages } from "@/lib/conversation/trust";
import { parseJsonBody } from "@/lib/validation/http";
import { resumeConversationGenerateSchema } from "@/lib/validation/schemas";
import type { Prisma, ResumeTemplate } from "@prisma/client";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Create your free SOUP account before generating the final resume." }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!profile) return Response.json({ error: "Your SOUP profile is not ready yet. Please sign in again." }, { status: 409 });
  const limited = await aiRateLimitResponse(request, profile.id);
  if (limited) return limited;

  const parsed = await parseJsonBody(request, resumeConversationGenerateSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const requestedSessionId = body.sessionId || "";
  const session = requestedSessionId
    ? await prisma.chatSession.findFirst({ where: { id: requestedSessionId, profileId: profile.id, workflow: "RESUME" }, include: { messages: { orderBy: { createdAt: "desc" }, take: 100 } } })
    : await prisma.chatSession.findFirst({ where: { profileId: profile.id, workflow: "RESUME" }, orderBy: { updatedAt: "desc" }, include: { messages: { orderBy: { createdAt: "desc" }, take: 100 } } });
  if (requestedSessionId && !session) return Response.json({ error: "That resume conversation is no longer available." }, { status: 404 });
  if (!session) return Response.json({ error: "Continue the resume conversation before generating the final files." }, { status: 409 });
  const sessionMessages = [...session.messages].reverse();
  const transcript = buildTrustedAIConversationMessages(sessionMessages, 80, 45_000);
  if (body?.importedResume?.content) {
    transcript.unshift({ role: "user", content: `Existing resume supplied by the user as source material. Preserve its factual content unless the later conversation explicitly changes it: ${JSON.stringify(body.importedResume.content).slice(0, 20_000)}` });
  }
  const userMessageCount = await prisma.chatMessage.count({ where: { sessionId: session.id, role: "USER" } });
  if (userMessageCount < 2) {
    return Response.json({ error: "Tell SOUP a little more about your background before generating the resume." }, { status: 400 });
  }

  try {
    const generated = await generateResumeFromConversation(transcript);
    const saved = await prisma.$transaction(async (tx) => {
      const resume = await tx.resume.create({
        data: {
          profileId: profile.id,
          title: generated.content.targetRole ? `${generated.content.targetRole} Resume` : "My SOUP Resume",
          template: generated.content.template as ResumeTemplate,
          status: "READY",
          content: generated.content as unknown as Prisma.InputJsonValue,
          coverLetter: generated.coverLetter,
          previewTips: generated.previewTips as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.resumeVersion.create({
        data: {
          resumeId: resume.id,
          version: 1,
          title: resume.title,
          template: resume.template,
          content: resume.content as Prisma.InputJsonValue,
          coverLetter: resume.coverLetter,
        },
      });
      return resume;
    });
    await refreshCustomerContext(profile.id);
    return Response.json({ resumeId: saved.id, generated });
  } catch (error) {
    logServerError("RESUME_GENERATION_ERROR", error);
    if (error instanceof AIConfigError) {
      return Response.json({ error: "SOUP Intelligence is not configured correctly. Please check the server AI configuration and try again." }, { status: 503 });
    }
    return Response.json({ error: "SOUP could not prepare the resume draft. Please try again." }, { status: 502 });
  }
}
