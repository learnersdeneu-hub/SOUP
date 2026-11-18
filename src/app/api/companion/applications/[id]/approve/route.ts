import { requireCompanionAuth } from "@/lib/companion/auth";
import { approveApplicationForSubmission } from "@/lib/applications/approve";
import { paymentRequiredResponse } from "@/lib/payments/access";

export const runtime = "nodejs";

// The desktop run's "Approve for submission" action — reuses the exact
// same deterministic readiness check as the student-facing web approval
// (src/app/api/applications/[id]/approve/route.ts). The student clicking
// this button in the run panel *is* the explicit approval; there is no
// separate declaration checkbox here because the click itself is it.
// This still only moves SOUP's own record to READY_TO_SUBMIT — it never
// clicks anything on the university's own site, which stays the
// student's action regardless.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const current = await requireCompanionAuth(request);
  if (!current.ok) return current.response;
  const gated = await paymentRequiredResponse(current.profile.id, current.profile.user.role);
  if (gated) return gated;

  const result = await approveApplicationForSubmission(current.profile.id, current.profile.user.id, params.id);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ ok: true, status: result.status, unchanged: result.unchanged });
}
