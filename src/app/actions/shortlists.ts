"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/auth/currentUser";

const ALLOWED = new Set(["KEEP", "REMOVE", "FINALIST", "UNDECIDED"]);

export async function setShortlistDecision(itemId: string, planId: string, decision: string) {
  const { profile } = await requireProfile();
  if (!ALLOWED.has(decision)) throw new Error("Invalid shortlist decision.");
  const item = await prisma.universityShortlistItem.findFirst({
    where: { id: itemId, shortlist: { id: planId, profileId: profile.id } },
    select: { id: true },
  });
  if (!item) throw new Error("University match not found.");

  if (decision === "FINALIST") {
    const finalists = await prisma.universityShortlistItem.count({ where: { shortlistId: planId, studentDecision: "FINALIST", id: { not: itemId } } });
    if (finalists >= 3) throw new Error("Keep your final list to three universities. Remove one finalist before adding another.");
  }

  await prisma.universityShortlistItem.update({
    where: { id: itemId },
    data: { studentDecision: decision === "UNDECIDED" ? null : decision, studentDecisionAt: decision === "UNDECIDED" ? null : new Date() },
  });
  revalidatePath(`/plans/${planId}`);
  revalidatePath(`/plans/${planId}/compare`);
  revalidatePath("/plans");
  revalidatePath("/dashboard");
}
