import { prisma } from "@/lib/prisma";
import { MY_COLLEGES_CAP } from "@/lib/applications/lifecycle";
import { CAPACITY_UPGRADE_CAP } from "@/lib/payments/config";

// Server-only (imports Prisma) — kept separate from lifecycle.ts, which is
// imported by the client-side AddToMyCollegesButton and must stay free of
// server-only dependencies. Most students never see this: it only raises
// the cap for the rare student who has paid for the hidden capacity add-on
// (see CAPACITY_UPGRADE_* in src/lib/payments/config.ts).
export async function effectiveCollegesCap(profileId: string): Promise<number> {
  const upgraded = await prisma.payment.findFirst({ where: { profileId, type: "CAPACITY_UPGRADE", status: "PAID" }, select: { id: true } });
  return upgraded ? CAPACITY_UPGRADE_CAP : MY_COLLEGES_CAP;
}
