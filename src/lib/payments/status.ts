import { prisma } from "@/lib/prisma";

// Same "is this student on a paid plan" logic src/lib/queries/dashboard.ts
// computes inline from its own already-fetched payments array — pulled out
// here as a standalone, independently-queryable helper for call sites (like
// Companion Web gating) that don't otherwise need the rest of the dashboard
// data load.
export async function getPremiumStatus(profileId: string): Promise<{ plusActive: boolean; conciergeActive: boolean }> {
  const premiumPayments = await prisma.payment.findMany({
    where: { profileId, type: "PREMIUM_COUNSELING", status: "PAID" },
    select: { title: true, metadata: true },
  });
  const conciergeActive = premiumPayments.some((payment) => {
    const metadata = payment.metadata && typeof payment.metadata === "object" && !Array.isArray(payment.metadata) ? payment.metadata as Record<string, unknown> : {};
    return payment.title === "SOUP Concierge" || metadata.plan === "premium_plus";
  });
  return { plusActive: conciergeActive || premiumPayments.length > 0, conciergeActive };
}
