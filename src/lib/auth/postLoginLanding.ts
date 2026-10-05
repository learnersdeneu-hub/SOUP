import { prisma } from "@/lib/prisma";

// A student who is still exploring (never started an application, never
// paid for anything) lands on the marketing/Noodles home page after
// signing in, not the dashboard — the dashboard is for students who have
// actually begun their journey. This applies uniformly, including to
// staff/admin accounts' own student-side profile, by design: the signal is
// real account activity, not role.
//
// "Started" is read off StudentCase.stage, which already moves off its
// EXPLORING default the moment an application is created (see
// src/app/api/applications/route.ts's studentCase.update to "APPLYING").
// "Paid" is checked separately since a student could technically pay for a
// support plan without yet having a StudentApplication row.
export async function determinePostLoginLanding(profileId: string): Promise<"/dashboard" | "/"> {
  const [studentCase, paidCount] = await Promise.all([
    prisma.studentCase.findUnique({ where: { profileId }, select: { stage: true } }),
    prisma.payment.count({ where: { profileId, status: "PAID" } }),
  ]);
  const started = Boolean(studentCase && studentCase.stage !== "EXPLORING");
  return started || paidCount > 0 ? "/dashboard" : "/";
}
