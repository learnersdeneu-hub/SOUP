import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/validation/http";
import { companionPairSchema } from "@/lib/validation/schemas";
import { redeemPairingCode } from "@/lib/companion/auth";

export const runtime = "nodejs";

// Called by the extension itself, before it has any credential — this is the
// one companion route that is not bearer-authenticated, guarded instead by
// the short-lived, single-use pairing code.
export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, companionPairSchema);
  if (!parsed.ok) return parsed.response;
  const result = await redeemPairingCode(parsed.data.code, parsed.data.deviceLabel);
  if (!result.ok) {
    return Response.json({ error: result.reason === "EXPIRED" ? "This pairing code has expired or was already used. Generate a new one from My SOUP." : "Invalid pairing code." }, { status: 409 });
  }
  const profile = await prisma.profile.findUnique({ where: { id: result.profileId }, include: { user: { select: { fullName: true, email: true } } } });
  return Response.json({ token: result.token, profile: profile ? { fullName: profile.user.fullName, email: profile.user.email } : null });
}
