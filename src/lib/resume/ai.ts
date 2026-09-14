import { getAIProvider } from "@/lib/ai/registry";
import { AIConfigError, AIProviderError, type AIMessage } from "@/lib/ai/types";
import type { GeneratedResume, ResumeTemplateKey } from "@/lib/resume/types";
import { z } from "zod";

const SYSTEM_PROMPT = `You are SOUP's professional resume and cover-letter editor. Turn the user's factual information into a concise, employer-ready resume and short cover letter. Do not invent employers, qualifications, dates, awards, skills, grades, immigration status, or achievements. You may improve wording and structure only. The resume must be designed to fit within two A4 pages in SOUP's fixed template. Adapt emphasis to the selected template. The cover letter must be 100-300 words and read as a concise life/career journey, not as a generic template. Return JSON only, with no markdown.

Required JSON schema:
{
  "content": {
    "template": "STUDENT|GRADUATE|PROFESSIONAL|INTERNATIONAL_STUDENT|JOB_SEEKER",
    "targetRole": "string",
    "personal": {"fullName":"string","email":"string","phone":"string","location":"string","linkedin":"string","portfolio":"string","headline":"string","summary":"string"},
    "experience": [{"employer":"string","title":"string","location":"string","startDate":"string","endDate":"string","bullets":["string"]}],
    "education": [{"institution":"string","qualification":"string","field":"string","location":"string","startDate":"string","endDate":"string","details":["string"]}],
    "projects": [{"name":"string","description":"string","link":"string"}],
    "skills": ["string"],
    "achievements": ["string"],
    "certifications": ["string"],
    "languages": ["string"]
  },
  "coverLetter": "100-300 words",
  "previewTips": [{"title":"short improvement tip","why":"one sentence grounded only in information missing or weak in the supplied information"}]
}
Return at most three previewTips. Keep these limited to practical, evidence-grounded improvement tips. Never claim ATS percentages, employment probabilities, or score changes.`;

function cleanText(value: unknown, max = 5000) {
  return String(value ?? "").trim().slice(0, max);
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = (fenced || text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI did not return structured resume data.");
  return JSON.parse(candidate.slice(start, end + 1));
}

const templateSchema = z.enum(["STUDENT", "GRADUATE", "PROFESSIONAL", "INTERNATIONAL_STUDENT", "JOB_SEEKER"]);
const optionalString = z.string().optional().default("");
const resumeAiResultSchema = z.object({
  content: z.object({
    template: templateSchema.catch("JOB_SEEKER"),
    targetRole: z.string().default(""),
    personal: z.object({
      fullName: z.string().default(""),
      email: z.string().default(""),
      phone: optionalString,
      location: optionalString,
      linkedin: optionalString,
      portfolio: optionalString,
      photoDataUrl: optionalString,
      headline: z.string().default(""),
      summary: z.string().default(""),
    }),
    experience: z.array(z.object({
      employer: z.string().default(""), title: z.string().default(""), location: optionalString,
      startDate: optionalString, endDate: optionalString, bullets: z.array(z.string()).default([]),
    })).default([]),
    education: z.array(z.object({
      institution: z.string().default(""), qualification: z.string().default(""), field: optionalString, location: optionalString,
      startDate: optionalString, endDate: optionalString, details: z.array(z.string()).optional().default([]),
    })).default([]),
    projects: z.array(z.object({ name: z.string().default(""), description: z.string().default(""), link: optionalString })).default([]),
    skills: z.array(z.string()),
    achievements: z.array(z.string()).default([]),
    certifications: z.array(z.string()).default([]),
    languages: z.array(z.string()).default([]),
  }),
  coverLetter: z.string(),
  previewTips: z.array(z.object({ title: z.string(), why: z.string() })).optional().default([]),
});

function validate(result: unknown, template?: ResumeTemplateKey): GeneratedResume {
  const parsed = resumeAiResultSchema.safeParse(result);
  if (!parsed.success) throw new Error("AI returned an incomplete resume.");
  const selectedTemplate = template || parsed.data.content.template;
  const content = {
    ...parsed.data.content,
    template: templateSchema.safeParse(selectedTemplate).success ? selectedTemplate : "JOB_SEEKER",
    targetRole: cleanText(parsed.data.content.targetRole, 160),
  } as GeneratedResume["content"];
  const cover = cleanText(parsed.data.coverLetter, 2400);
  const words = cover.split(/\s+/).filter(Boolean);
  if (words.length < 60 || words.length > 340) throw new Error("AI returned a cover letter outside the expected length.");
  const tips = parsed.data.previewTips
    .slice(0, 3)
    .map((tip) => ({ title: cleanText(tip.title, 120), why: cleanText(tip.why, 320) }))
    .filter((tip) => tip.title && tip.why);
  return { content, coverLetter: cover, previewTips: tips };
}


export async function generateResumeFromSource(source: unknown, template: ResumeTemplateKey) {
  let provider;
  try {
    provider = getAIProvider();
  } catch (e) {
    if (e instanceof AIConfigError) throw e;
    throw new AIConfigError(e instanceof Error ? e.message : "AI provider is not configured.");
  }

  const userMessage: AIMessage = { role: "user", content: JSON.stringify(source) };
  let fullText = "";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    for await (const event of provider.streamChat({ system: SYSTEM_PROMPT, messages: [userMessage], maxTokens: 3000 }, controller.signal)) {
      if (event.type === "delta") fullText += event.text;
      if (event.type === "done" && event.fullText) fullText = event.fullText;
    }
  } catch (e) {
    throw e instanceof AIProviderError ? e : new AIProviderError(e instanceof Error ? e.message : "Resume generation failed.", true, e);
  } finally {
    clearTimeout(timeout);
  }
  return validate(extractJson(fullText), template);
}


export async function generateResumeFromConversation(transcript: Array<{ role: string; content: string }>) {
  const provider = getAIProvider();
  const conversationPrompt = `${SYSTEM_PROMPT}\n\nFor this conversational workflow, choose the most appropriate template yourself from the allowed template values. The input is a transcript, not a form. Extract only facts the user actually provided. If a detail was never supplied, leave it blank rather than inventing it.`;
  const userMessage: AIMessage = { role: "user", content: JSON.stringify({ kind: "conversation_transcript", transcript }) };
  let fullText = "";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    for await (const event of provider.streamChat({ system: conversationPrompt, messages: [userMessage], maxTokens: 3200 }, controller.signal)) {
      if (event.type === "delta") fullText += event.text;
      if (event.type === "done" && event.fullText) fullText = event.fullText;
    }
  } catch (e) {
    throw e instanceof AIProviderError ? e : new AIProviderError(e instanceof Error ? e.message : "Resume generation failed.", true, e);
  } finally {
    clearTimeout(timeout);
  }
  return validate(extractJson(fullText));
}
