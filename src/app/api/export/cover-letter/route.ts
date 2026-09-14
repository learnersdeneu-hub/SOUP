import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { ResumeContent } from "@/lib/resume/types";
import { parseSearchParams } from "@/lib/validation/http";
import { exportDocumentQuerySchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!profile) return NextResponse.json({ error: "No profile found." }, { status: 404 });
  const query = parseSearchParams(request, exportDocumentQuerySchema);
  if (!query.ok) return query.response;
  const { id, format } = query.data;
  const resume = id ? await prisma.resume.findFirst({ where: { id, profileId: profile.id } }) : null;
  if (!resume || !resume.coverLetter) return NextResponse.json({ error: "Cover letter not found." }, { status: 404 });
  if (format === "docx" || format === "word") {
    const { renderCoverLetterDocx } = await import("@/lib/export/simpleDocx");
    const file = renderCoverLetterDocx(resume.content as unknown as ResumeContent, resume.coverLetter);
    return new NextResponse(new Uint8Array(file), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Content-Disposition": `attachment; filename="cover-letter-${resume.id}.docx"`, "Content-Length": String(file.length) } });
  }
  const { renderCoverLetterPdf } = await import("@/lib/export/coverLetterPdf");
  const file = await renderCoverLetterPdf(resume.content as unknown as ResumeContent, resume.coverLetter);
  return new NextResponse(new Uint8Array(file), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="cover-letter-${resume.id}.pdf"` } });
}
