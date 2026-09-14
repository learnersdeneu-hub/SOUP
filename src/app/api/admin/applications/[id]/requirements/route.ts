import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/logging/safe";
import { getApiStaff } from "@/lib/auth/apiStaff";
import { APPLICATION_OPERATIONS_ROLES } from "@/lib/auth/roles";
import { prepareApplicationRequirements } from "@/lib/applications/requirements";
import { aiRateLimitResponse } from "@/lib/ai/httpRateLimit";
import { parseJsonBody } from "@/lib/validation/http";
import { adminRequirementsRefreshSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const staff = await getApiStaff(APPLICATION_OPERATIONS_ROLES);
  if (!staff) return Response.json({ error: "Admissions access required." }, { status: 403 });
  const limited = await aiRateLimitResponse(request, `staff:${staff.user.id}`);
  if (limited) return limited;
  const parsed = await parseJsonBody(request, adminRequirementsRefreshSchema);
  if (!parsed.ok) return parsed.response;
  const { refresh } = parsed.data;
  const application = await prisma.studentApplication.findUnique({ where: { id: params.id }, select: { profileId: true } });
  if (!application) return Response.json({ error: "Application not found." }, { status: 404 });
  try {
    const result = await prepareApplicationRequirements({ applicationId: params.id, profileId: application.profileId, refresh, generatedBy: "STAFF" });
    await prisma.studentApplication.update({ where: { id: params.id }, data: { assignedStaffUserId: staff.user.id, lastSoupActionAt: new Date() } });
    await prisma.studentApplicationEvent.create({
      data: {
        applicationId: params.id,
        actorUserId: staff.user.id,
        eventType: refresh ? "REQUIREMENTS_REFRESHED" : "REQUIREMENTS_PREPARED",
        message: refresh ? "SOUP staff refreshed the source-backed admissions requirements." : "SOUP staff prepared the source-backed admissions requirements.",
        metadata: { checklistId: result.checklistId || null, generatedBy: "STAFF" },
      },
    });
    return Response.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "APPLICATION_NOT_MANAGED") return Response.json({ error: "SOUP cannot manage requirements for this external application." }, { status: 409 });
    if (code === "REQUIREMENTS_UNCONFIRMED") return Response.json({ error: "Current official requirements could not be confirmed reliably. Check the university source and retry." }, { status: 422 });
    logServerError("SOUP_ADMIN_APPLICATION_REQUIREMENTS_ERROR", error);
    return Response.json({ error: "Could not prepare application requirements." }, { status: 503 });
  }
}
