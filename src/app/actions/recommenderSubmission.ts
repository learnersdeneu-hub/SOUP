"use server";

import { prisma } from "@/lib/prisma";
import { reconcileRecommenderWithJourney } from "@/lib/journey/reconcileRecommender";

// Token-authenticated — the recommender has no SOUP account and no
// session, so every action here re-validates against the invite token
// itself rather than requireProfile(). See src/app/recommend/[token] and
// the companion file-upload route (/api/recommend/[token]/upload) for the
// other half of this submission flow (text vs. file, per product decision).

function clean(value: FormDataEntryValue | null, max = 20000) {
  return String(value || "").trim().slice(0, max);
}

export async function submitRecommendationLetterText(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = clean(formData.get("token"), 128);
  const letterText = clean(formData.get("letterText"), 20000);
  if (!letterText) return { ok: false, error: "Write your recommendation letter before submitting." };

  const recommender = await prisma.recommender.findFirst({ where: { inviteToken: token } });
  if (!recommender) return { ok: false, error: "This link is invalid." };
  if (recommender.inviteTokenExpiresAt && recommender.inviteTokenExpiresAt.getTime() < Date.now()) {
    return { ok: false, error: "This link has expired. Ask the student to resend your invite." };
  }
  if (recommender.status === "SUBMITTED") return { ok: false, error: "A letter has already been submitted for this request." };

  await prisma.recommendationLetter.upsert({
    where: { recommenderId: recommender.id },
    create: { recommenderId: recommender.id, submissionMethod: "TEXT", letterText },
    update: { submissionMethod: "TEXT", letterText, documentId: null, submittedAt: new Date() },
  });
  await prisma.recommender.update({ where: { id: recommender.id }, data: { status: "SUBMITTED" } });
  await reconcileRecommenderWithJourney(recommender.profileId, recommender.id, { documentId: null }).catch(() => undefined);

  return { ok: true };
}
