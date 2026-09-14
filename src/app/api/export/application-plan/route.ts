import React from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ApplicationPlanPDF } from "@/lib/pdf/applicationPlan";
import { parseSearchParams } from "@/lib/validation/http";
import { exportByIdQuerySchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  const query = parseSearchParams(request, exportByIdQuerySchema);
  if (!query.ok) return query.response;
  const id = query.data.id;
  if (!profile || !id) return Response.json({ error: "Not found." }, { status: 404 });
  const shortlist = await prisma.universityShortlist.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" }, include: { university: true, program: true } } },
  });
  if (!shortlist || shortlist.profileId !== profile.id) return Response.json({ error: "Not found." }, { status: 404 });
  const buffer = await renderToBuffer(React.createElement(ApplicationPlanPDF, { shortlist }) as React.ReactElement<DocumentProps>);
  return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="soup-university-application-plan-v${shortlist.version}.pdf"` } });
}
