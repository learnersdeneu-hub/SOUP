import { requireCompanionAuth } from "@/lib/companion/auth";
import { listRunnableApplications } from "@/lib/companion/applicationRun";

export const runtime = "nodejs";

// Feeds the desktop panel's "Start applications" picker: the student's
// own My Colleges entries that a run is actually allowed to touch (see
// listRunnableApplications for the exact ownership/status filter).
export async function GET(request: Request) {
  const current = await requireCompanionAuth(request);
  if (!current.ok) return current.response;

  const applications = await listRunnableApplications(current.profile.id);
  return Response.json({ applications });
}
