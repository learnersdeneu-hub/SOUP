import { prisma } from "@/lib/prisma";

export async function listResumes(profileId: string) {
  return prisma.resume.findMany({
    where: { profileId, status: { not: "ARCHIVED" } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      template: true,
      status: true,
      content: true,
      coverLetter: true,
      createdAt: true,
      updatedAt: true,
      versions: { orderBy: { version: "desc" }, take: 10, select: { id: true, version: true, createdAt: true } },
    },
  });
}

export async function getOwnedResume(profileId: string, resumeId?: string | null) {
  if (resumeId) {
    return prisma.resume.findFirst({ where: { id: resumeId, profileId } });
  }
  return prisma.resume.findFirst({ where: { profileId, status: { not: "ARCHIVED" } }, orderBy: { updatedAt: "desc" } });
}
