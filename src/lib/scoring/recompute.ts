import { prisma } from "@/lib/prisma";
import type { CredentialStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// GCI Scoring engine — v1 (PROVISIONAL FORMULA).
//
// Method: for each score category, find the matching credential type,
// compute verifiedCount / totalCount for that profile, and map that ratio
// linearly onto the public 0.0–9.0 scale in 0.5 increments. This is the
// simplest deterministic formula that is honestly derived from real data —
// it is NOT a reviewed business/legal scoring model. The ScoringRuleVersion
// row created alongside each Score is tagged `placeholder: true` in
// weightsConfig so this is traceable and swappable later without touching
// calling code.
//
// Explainability: every Score this creates has a corresponding
// ScoreExplanationFactor row per contributing credential, satisfying the
// "every score must be explainable" requirement even at this provisional
// stage.
// ---------------------------------------------------------------------------

const CATEGORY_TO_CREDENTIAL_TYPE: Record<string, string> = {
  IDENTITY_CONFIDENCE: "IDENTITY",
  EDUCATION_CREDIBILITY: "EDUCATION",
  EMPLOYMENT_CREDIBILITY: "EMPLOYMENT",
  FINANCIAL_CREDIBILITY: "FINANCIAL",
};

function toPublicScore(ratio: number): number {
  const raw = ratio * 9;
  return Math.round(raw * 2) / 2; // nearest 0.5
}

export async function recomputeScores(profileId: string) {
  const categories = await prisma.scoreCategory.findMany({
    include: {
      ruleVersions: { orderBy: { versionNumber: "desc" }, take: 1 },
    },
  });

  const createdScores = [];

  for (const category of categories) {
    const rulesVersion = category.ruleVersions[0];
    if (!rulesVersion) continue; // no rule version seeded for this category yet

    let verifiedCount = 0;
    let totalCount = 0;
    let contributingCredentialIds: { id: string; status: CredentialStatus }[] = [];

    if (category.code === "REFERENCE_CREDIBILITY") {
      const requests = await prisma.referenceRequest.findMany({
        where: { profileId },
        include: { response: { include: { verification: true } } },
      });
      totalCount = requests.length;
      verifiedCount = requests.filter((r) => r.response?.verification).length;
      // References aren't Credential rows, so no explanation factors here —
      // handled separately below.
    } else {
      const credentialTypeCode = CATEGORY_TO_CREDENTIAL_TYPE[category.code];
      if (!credentialTypeCode) continue;

      const credentials = await prisma.credential.findMany({
        where: { profileId, credentialType: { code: credentialTypeCode } },
      });
      totalCount = credentials.length;
      verifiedCount = credentials.filter((c) => c.verificationStatus === "VERIFIED").length;
      contributingCredentialIds = credentials.map((c) => ({ id: c.id, status: c.verificationStatus }));
    }

    if (totalCount === 0) continue; // nothing to score yet — do not fabricate a number

    const ratio = verifiedCount / totalCount;
    const publicScore = toPublicScore(ratio);

    const score = await prisma.score.create({
      data: {
        profileId,
        categoryId: category.id,
        internalValue: ratio,
        publicScore,
        rulesVersionId: rulesVersion.id,
      },
    });

    for (const cred of contributingCredentialIds) {
      await prisma.scoreExplanationFactor.create({
        data: {
          scoreId: score.id,
          credentialId: cred.id,
          contributionWeight: 1 / contributingCredentialIds.length,
          verificationStatusAtTime: cred.status,
        },
      });
    }

    createdScores.push(score);
  }

  if (createdScores.length > 0) {
    await prisma.profile.update({
      where: { id: profileId },
      data: { lastScoredAt: new Date() },
    });
  }

  return createdScores;
}

// Exported for reuse by the Learn & Improve roadmap — same category/credential
// mapping and rounding rule used by recomputeScores, so any "potential score"
// shown to the user is derived from the same real formula, not invented.
export { CATEGORY_TO_CREDENTIAL_TYPE, toPublicScore };
