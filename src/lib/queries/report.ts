import { prisma } from "@/lib/prisma";

export async function getReportData(profileId: string) {
  const [profile, credentials, scores] = await Promise.all([
    prisma.profile.findUniqueOrThrow({ where: { id: profileId }, include: { user: true } }),
    prisma.credential.findMany({
      where: { profileId },
      include: {
        credentialType: true,
        educationDetail: true,
        employmentDetail: true,
        identityDetail: true,
        financialDetail: true,
        verificationRequests: { orderBy: { submittedAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.score.findMany({
      where: { profileId },
      orderBy: { computedAt: "desc" },
      include: { category: true },
    }),
  ]);

  const byType = (code: string) => credentials.filter((c) => c.credentialType.code === code);

  const latestByCategory = new Map<string, (typeof scores)[number]>();
  for (const s of scores) {
    if (!latestByCategory.has(s.categoryId)) latestByCategory.set(s.categoryId, s);
  }
  const latestScores = Array.from(latestByCategory.values());
  const overallScore =
    latestScores.length > 0
      ? latestScores.reduce((sum, s) => sum + Number(s.publicScore), 0) / latestScores.length
      : null;

  return {
    profile,
    education: byType("EDUCATION"),
    employment: byType("EMPLOYMENT"),
    identity: byType("IDENTITY"),
    financial: byType("FINANCIAL"),
    latestScores,
    overallScore,
  };
}
