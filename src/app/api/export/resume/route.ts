import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { ResumeContent } from "@/lib/resume/types";
import { parseSearchParams } from "@/lib/validation/http";
import { resumeExportQuerySchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!profile) return NextResponse.json({ error: "No profile found." }, { status: 404 });

  const query = parseSearchParams(request, resumeExportQuerySchema);
  if (!query.ok) return query.response;
  const { id, format } = query.data;
  const resume = id
    ? await prisma.resume.findFirst({ where: { id, profileId: profile.id } })
    : await prisma.resume.findFirst({ where: { profileId: profile.id, status: { not: "ARCHIVED" } }, orderBy: { updatedAt: "desc" } });
  if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });

  if (format === "json") {
    return NextResponse.json({ id: resume.id, content: resume.content, coverLetter: resume.coverLetter, previewTips: resume.previewTips }, { headers: { "Content-Disposition": `attachment; filename="resume-${resume.id}.json"` } });
  }
  if (format === "docx" || format === "word") {
    const { renderResumeDocx } = await import("@/lib/export/simpleDocx");
    const file = renderResumeDocx(resume.content as unknown as ResumeContent);
    return new NextResponse(new Uint8Array(file), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Content-Disposition": `attachment; filename="resume-${resume.id}.docx"`, "Content-Length": String(file.length) } });
  }

  const { renderResumePdf } = await import("@/lib/export/resumePdf");
  const file = await renderResumePdf(resume.content as unknown as ResumeContent);
  return new NextResponse(new Uint8Array(file), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="resume-${resume.id}.pdf"` } });
}
