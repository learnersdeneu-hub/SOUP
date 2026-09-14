import { prisma } from "@/lib/prisma";

export type ResumeData = {
  fullName: string;
  profileId: string;
  badges: {
    identity: boolean;
    education: boolean;
    employment: boolean;
    references: boolean;
  };
  overallScore: number | null;
  categoryCount: number;
};

// Real data for the Resume Builder workflow. No fabricated numbers:
// if the profile has no computed scores yet, overallScore is null and the
// UI must show a "not yet scored" state rather than inventing a figure.
export async function getResumeData(userId: string): Promise<ResumeData | null> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!profile) return null;

  const verifiedCredentials = await prisma.credential.findMany({
    where: { profileId: profile.id, verificationStatus: "VERIFIED" },
    include: { credentialType: true },
  });

  const hasVerified = (code: string) =>
    verifiedCredentials.some((c) => c.credentialType.code === code);

  const referenceVerified = await prisma.referenceVerification.findFirst({
    where: {
      referenceResponse: {
        referenceRequest: { profileId: profile.id },
      },
    },
  });

  const allScores = await prisma.score.findMany({
    where: { profileId: profile.id },
    orderBy: { computedAt: "desc" },
  });

  // Latest score per category only.
  const latestByCategory = new Map<string, (typeof allScores)[number]>();
  for (const s of allScores) {
    if (!latestByCategory.has(s.categoryId)) latestByCategory.set(s.categoryId, s);
  }
  const latestScores = Array.from(latestByCategory.values());

  const overallScore =
    latestScores.length > 0
      ? latestScores.reduce((sum, s) => sum + Number(s.publicScore), 0) / latestScores.length
      : null;

  return {
    fullName: profile.user.fullName,
    profileId: profile.id,
    badges: {
      identity: hasVerified("IDENTITY"),
      education: hasVerified("EDUCATION"),
      employment: hasVerified("EMPLOYMENT"),
      references: !!referenceVerified,
    },
    overallScore,
    categoryCount: latestScores.length,
  };
}
