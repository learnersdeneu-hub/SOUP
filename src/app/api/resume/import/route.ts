import { AIConfigError, AIProviderError } from "@/lib/ai/types";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generateResumeFromSource } from "@/lib/resume/ai";
import type { ResumeTemplateKey } from "@/lib/resume/types";
import { aiRateLimitResponse } from "@/lib/ai/httpRateLimit";
import { resumeImportFormSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

const TEMPLATES = new Set<ResumeTemplateKey>(["STUDENT", "GRADUATE", "PROFESSIONAL", "INTERNATIONAL_STUDENT", "JOB_SEEKER"]);
const MAX_BYTES = 8 * 1024 * 1024;
function ext(name: string) { return name.toLowerCase().split(".").pop() || ""; }

async function extractText(file: File) {
  if (file.size > MAX_BYTES) throw new Error("Resume file must be 8 MB or smaller.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = ext(file.name);
  const mime = file.type.toLowerCase();

  if (mime === "application/pdf" || extension === "pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || extension === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (mime.startsWith("image/") || ["png", "jpg", "jpeg"].includes(extension)) {
    const { recognize } = await import("tesseract.js");
    const result = await recognize(buffer, "eng", { logger: () => undefined });
    return result.data.text;
  }

  throw new Error("Use a PDF, DOCX, PNG, JPG or JPEG resume.");
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Create or sign in to your SOUP account before uploading a private resume." }, { status: 401 });
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!profile) return Response.json({ error: "Your SOUP profile is not ready yet." }, { status: 409 });

  const limited = await aiRateLimitResponse(request, profile.id);
  if (limited) return limited;
  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "Invalid upload." }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose a resume file." }, { status: 400 });
  const parsedForm = resumeImportFormSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsedForm.success) {
    const rawTemplate = String(form.get("template") || "JOB_SEEKER") as ResumeTemplateKey;
    const rawTargetRole = String(form.get("targetRole") || "").trim();
    if (!TEMPLATES.has(rawTemplate)) return Response.json({ error: "Choose a valid SOUP resume template." }, { status: 400 });
    if (!rawTargetRole) return Response.json({ error: "Tell us the role or direction you want to target." }, { status: 400 });
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const template = parsedForm.data.template as ResumeTemplateKey;
  const targetRole = parsedForm.data.targetRole;

  try {
    const text = (await extractText(file)).replace(/\u0000/g, "").trim().slice(0, 30_000);
    if (text.length < 40) throw new Error("We could not read enough text from this resume. Try a clearer file or another format.");
    const generated = await generateResumeFromSource({ kind: "imported_resume", targetRole, originalFileName: file.name, extractedResumeText: text }, template);
    return Response.json({ ...generated, sourceFileName: file.name, sourceMimeType: file.type || null });
  } catch (e) {
    if (e instanceof AIConfigError) return Response.json({ error: "SOUP Intelligence is not configured yet. Please try again after AI setup is complete." }, { status: 503 });
    const message = e instanceof AIProviderError ? "SOUP Intelligence could not analyze this resume. Please try again." : e instanceof Error ? e.message : "Could not import this resume.";
    return Response.json({ error: message }, { status: 422 });
  }
}
