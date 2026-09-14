import { prisma } from "@/lib/prisma";
import { CATEGORY_TO_CREDENTIAL_TYPE, toPublicScore } from "@/lib/scoring/recompute";

export type Recommendation = {
  categoryLabel: string;
  description: string;
  delta: number | null; // null = not yet estimable (no credentials in this category at all)
  actionHref: string;
};

export type RoadmapData = {
  currentScore: number | null;
  potentialScore: number | null;
  estimableCategoryCount: number;
  profileCompletionPct: number;
  recommendations: Recommendation[];
};

export async function getRoadmap(profileId: string): Promise<RoadmapData> {
  const profile = await prisma.profile.findUniqueOrThrow({ where: { id: profileId } });
  const categories = await prisma.scoreCategory.findMany();

  const recommendations: Recommendation[] = [];
  const currentScores: number[] = [];
  const potentialScores: number[] = [];

  for (const category of categories) {
    if (category.code === "REFERENCE_CREDIBILITY") {
      const requests = await prisma.referenceRequest.findMany({
        where: { profileId },
        include: { response: { include: { verification: true } } },
      });
      const total = requests.length;
      const verified = requests.filter((r) => r.response?.verification).length;

      if (total === 0) {
        recommendations.push({
          categoryLabel: category.label,
          description: "Add a professional or academic reference",
          delta: null,
          actionHref: "/report",
        });
        continue;
      }
      const current = toPublicScore(verified / total);
      const potential = toPublicScore(1);
      currentScores.push(current);
      potentialScores.push(potential);
      if (potential > current) {
        recommendations.push({
          categoryLabel: category.label,
          description: `Complete verification of ${total - verified} pending reference(s)`,
          delta: Number((potential - current).toFixed(1)),
          actionHref: "/report",
        });
      }
      continue;
    }

    const credentialTypeCode = CATEGORY_TO_CREDENTIAL_TYPE[category.code];
    if (!credentialTypeCode) continue;

    const credentials = await prisma.credential.findMany({
      where: { profileId, credentialType: { code: credentialTypeCode } },
    });
    const total = credentials.length;
    const verified = credentials.filter((c) => c.verificationStatus === "VERIFIED").length;
    const outstanding = credentials.filter(
      (c) => c.verificationStatus === "DRAFT" || c.verificationStatus === "PENDING_VERIFICATION"
    ).length;

    if (total === 0) {
      recommendations.push({
        categoryLabel: category.label,
        description: `Add a ${credentialTypeCode.toLowerCase()} credential to start scoring this category`,
        delta: null,
        actionHref: "/report",
      });
      continue;
    }

    const current = toPublicScore(verified / total);
    currentScores.push(current);

    if (outstanding > 0) {
      const potential = toPublicScore((verified + outstanding) / total);
      potentialScores.push(potential);
      if (potential > current) {
        recommendations.push({
          categoryLabel: category.label,
          description: `Complete verification of ${outstanding} pending ${credentialTypeCode.toLowerCase()} item(s)`,
          delta: Number((potential - current).toFixed(1)),
          actionHref: "/report",
        });
      }
    } else {
      potentialScores.push(current);
    }
  }

  const currentScore =
    currentScores.length > 0 ? currentScores.reduce((a, b) => a + b, 0) / currentScores.length : null;
  const potentialScore =
    potentialScores.length > 0 ? potentialScores.reduce((a, b) => a + b, 0) / potentialScores.length : null;

  return {
    currentScore,
    potentialScore,
    estimableCategoryCount: currentScores.length,
    profileCompletionPct: profile.profileCompletenessPct,
    recommendations,
  };
}
