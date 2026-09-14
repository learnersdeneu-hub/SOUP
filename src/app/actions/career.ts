"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/auth/currentUser";
import type { CareerGoalType } from "@prisma/client";

const TYPES = new Set<CareerGoalType>(["INTERNSHIP", "JOB", "UNIVERSITY", "SCHOLARSHIP", "COMPETITION", "CAREER_GROWTH"]);

export async function savePrimaryCareerGoal(formData: FormData) {
  const { profile } = await requireProfile();
  const goalType = String(formData.get("goalType") || "") as CareerGoalType;
  const targetTitle = String(formData.get("targetTitle") || "").trim().slice(0, 180);
  const targetOrganization = String(formData.get("targetOrganization") || "").trim().slice(0, 180) || null;
  const targetCountry = String(formData.get("targetCountry") || "").trim().slice(0, 120) || null;
  const notes = String(formData.get("notes") || "").trim().slice(0, 1200) || null;

  if (!TYPES.has(goalType)) throw new Error("Choose a valid goal type.");
  if (!targetTitle) throw new Error("Tell us what you are aiming for.");

  await prisma.$transaction(async (tx) => {
    await tx.careerGoal.updateMany({ where: { profileId: profile.id, isPrimary: true }, data: { isPrimary: false } });
    await tx.careerGoal.create({ data: { profileId: profile.id, goalType, targetTitle, targetOrganization, targetCountry, notes, isPrimary: true } });
  });

  await prisma.notification.create({
    data: {
      profileId: profile.id,
      type: "SYSTEM",
      title: "Career goal updated",
      body: "SOUP can now use your primary goal when discussing your resume and student journey.",
      href: "/counselor",
    },
  });

  revalidatePath("/counselor");
  revalidatePath("/dashboard");
}
