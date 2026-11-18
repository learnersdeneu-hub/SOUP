import { requireApiProfile } from "@/lib/auth/apiUser";
import { parseJsonBody } from "@/lib/validation/http";
import { applicationApproveSchema } from "@/lib/validation/schemas";
import { approveApplicationForSubmission } from "@/lib/applications/approve";

export async function POST(request: Request, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const current = await requireApiProfile();
  if (!current.ok) return current.response;
  const { authUser: user, profile } = current;
  const parsed = await parseJsonBody(request, applicationApproveSchema);
  if (!parsed.ok) return parsed.response;
  if (!parsed.data.declarationAccepted) return Response.json({ error: "Confirm the accuracy declaration before approving the application." }, { status: 400 });

  const result = await approveApplicationForSubmission(profile.id, user.id, params.id);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ ok: true, status: result.status, unchanged: result.unchanged });
}
