import { requireApiProfile } from "@/lib/auth/apiUser";
import { createPairingCode } from "@/lib/companion/auth";

export const runtime = "nodejs";

// Signed-in, cookie-authenticated web app only. The extension never calls
// this route — it calls /api/companion/pair with the code the student reads
// off their own screen and types (or the web page auto-fills for them) into
// the side panel.
export async function POST() {
  const current = await requireApiProfile();
  if (!current.ok) return current.response;
  const { code, expiresAt } = await createPairingCode(current.profile.id);
  return Response.json({ code, expiresAt });
}
