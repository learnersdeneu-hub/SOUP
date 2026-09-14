import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/logging/safe";
import { prepareApplicationRequirements } from "@/lib/applications/requirements";
import { aiRateLimitResponse } from "@/lib/ai/httpRateLimit";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in to prepare application requirements." }, { status: 401 });
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!profile) return Response.json({ error: "Your SOUP profile is not ready yet." }, { status: 409 });
  const limited = await aiRateLimitResponse(request, profile.id);
  if (limited) return limited;
  try {
    return Response.json(await prepareApplicationRequirements({ applicationId: params.id, profileId: profile.id, generatedBy: "STUDENT" }));
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "APPLICATION_NOT_FOUND") return Response.json({ error: "Application not found." }, { status: 404 });
    if (code === "APPLICATION_NOT_MANAGED") return Response.json({ error: "SOUP does not manage requirements for this external application." }, { status: 409 });
    if (code === "REQUIREMENTS_UNCONFIRMED") return Response.json({ error: "SOUP could not confirm a reliable application requirements list yet. Admissions staff can retry after checking the official program page." }, { status: 422 });
    logServerError("SOUP_APPLICATION_REQUIREMENTS_ERROR", error);
    return Response.json({ error: "SOUP could not prepare the application requirements right now." }, { status: 503 });
  }
}
