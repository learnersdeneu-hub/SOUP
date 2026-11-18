import { requireApiProfile } from "@/lib/auth/apiUser";
import { parseJsonBody } from "@/lib/validation/http";
import { applicationApproveSchema } from "@/lib/validation/schemas";
import { approveApplicationForSubmission } from "@/lib/applications/approve";
import { paymentRequiredResponse } from "@/lib/payments/access";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const current = await requireApiProfile();
  if (!current.ok) return current.response;
  const gated = await paymentRequiredResponse(current.profile.id, current.user.role);
  if (gated) return gated;
  const { authUser: user, profile } = current;
  const parsed = await parseJsonBody(request, applicationApproveSchema);
  if (!parsed.ok) return parsed.response;
  if (!parsed.data.declarationAccepted) return Response.json({ error: "Confirm the accuracy declaration before approving the application." }, { status: 400 });

  const result = await approveApplicationForSubmission(profile.id, user.id, params.id);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ ok: true, status: result.status, unchanged: result.unchanged });
}
