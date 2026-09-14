import { prisma } from "@/lib/prisma";

export async function getFinancialData(profileId: string) {
  const [credentials, score] = await Promise.all([
    prisma.credential.findMany({
      where: { profileId, credentialType: { code: "FINANCIAL" } },
      include: { financialDetail: true, documents: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.score.findFirst({
      where: { profileId, category: { code: "FINANCIAL_CREDIBILITY" } },
      orderBy: { computedAt: "desc" },
    }),
  ]);

  return {
    credentials,
    publicScore: score ? Number(score.publicScore) : null,
  };
}
