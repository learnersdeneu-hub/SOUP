import { prisma } from "@/lib/prisma";
import type { ServiceReferralType } from "@prisma/client";

type Attribution = { source: string; sourceSessionId: string | null; sourceMessageId: string | null };

export async function startPartnerReferral({ profileId, studentCaseId, type, partnerId, title, externalUrl, counselorRationale, attribution }: { profileId: string; studentCaseId: string; type: ServiceReferralType; partnerId: string; title: string; externalUrl: string; counselorRationale: string; attribution: Attribution }) {
  const recentSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await prisma.serviceReferral.findFirst({
    where: {
      profileId,
      partnerId,
      type,
      status: { in: ["RECOMMENDED", "OPENED", "STARTED"] },
      createdAt: { gte: recentSince },
    },
    orderBy: { updatedAt: "desc" },
  });

  const metadata = existing?.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
    ? existing.metadata as Record<string, unknown>
    : {};
  if (existing) {
    return prisma.serviceReferral.update({
      where: { id: existing.id },
      data: {
        status: "STARTED",
        externalUrl,
        counselorRationale,
        sourceSessionId: existing.sourceSessionId || attribution.sourceSessionId,
        sourceMessageId: existing.sourceMessageId || attribution.sourceMessageId,
        metadata: { ...metadata, source: attribution.source, lastOpenedAt: new Date().toISOString() },
      },
    });
  }

  return prisma.serviceReferral.create({
    data: {
      profileId,
      studentCaseId,
      type,
      partnerId,
      status: "STARTED",
      title,
      externalUrl,
      counselorRationale,
      sourceSessionId: attribution.sourceSessionId,
      sourceMessageId: attribution.sourceMessageId,
      metadata: { source: attribution.source, startedAt: new Date().toISOString(), lastOpenedAt: new Date().toISOString() },
    },
  });
}
