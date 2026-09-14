"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { recomputeScores } from "@/lib/scoring/recompute";

// Manually triggerable for this MVP increment since there is no org-side
// maker-checker console yet to trigger recompute automatically on
// verification approval. In production this should run as a side effect
// of resolveVerification(), not on user demand.
export async function recomputeMyScores() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const profile = await prisma.profile.findUniqueOrThrow({ where: { userId: user.id } });
  const scores = await recomputeScores(profile.id);

  revalidatePath("/report");
  revalidatePath("/resume");
  revalidatePath("/financial");
  revalidatePath("/learn");

  return scores;
}
