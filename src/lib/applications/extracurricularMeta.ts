import { prisma } from "@/lib/prisma";
import { normalizeExtracurricularMeta, type ExtracurricularMeta } from "@/lib/applications/coreProfile";

// Shared by src/app/actions/activities.ts and recommenders.ts — both need
// to flip one of the two "not applicable to me" flags on the same JSON
// column without clobbering whichever flag the other action last set.
export async function updateExtracurricularMeta(profileId: string, patch: Partial<ExtracurricularMeta>) {
  const studentCase = await prisma.studentCase.findUnique({ where: { profileId }, select: { extracurricularMeta: true } });
  const next = { ...normalizeExtracurricularMeta(studentCase?.extracurricularMeta), ...patch };
  await prisma.studentCase.upsert({
    where: { profileId },
    update: { extracurricularMeta: next },
    create: { profileId, extracurricularMeta: next },
  });
  return next;
}
