"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/auth/currentUser";
import type { GeneratedResume, ResumeTemplateKey } from "@/lib/resume/types";
import type { Prisma } from "@prisma/client";

const TEMPLATE_VALUES = new Set<ResumeTemplateKey>([
  "STUDENT",
  "GRADUATE",
  "PROFESSIONAL",
  "INTERNATIONAL_STUDENT",
  "JOB_SEEKER",
]);

function validateGeneratedResume(input: GeneratedResume) {
  if (!input || typeof input !== "object") throw new Error("Resume data is required.");
  if (!input.content || !TEMPLATE_VALUES.has(input.content.template)) throw new Error("Invalid resume template.");
  if (!input.content.personal?.fullName?.trim()) throw new Error("Resume name is required.");
  if (!input.content.personal?.email?.trim()) throw new Error("Resume email is required.");
  if (!input.coverLetter?.trim()) throw new Error("Cover letter is required.");
}

export async function saveResume(input: GeneratedResume, resumeId?: string) {
  const { profile } = await requireProfile();
  validateGeneratedResume(input);

  const data = {
    title: `${input.content.personal.fullName} — ${input.content.targetRole || "Resume"}`,
    template: input.content.template,
    status: "READY" as const,
    content: input.content as unknown as Prisma.InputJsonValue,
    coverLetter: input.coverLetter.trim(),
    previewTips: input.previewTips as unknown as Prisma.InputJsonValue,
  };

  let saved;
  if (resumeId) {
    const owned = await prisma.resume.findFirst({ where: { id: resumeId, profileId: profile.id } });
    if (!owned) throw new Error("Resume not found.");
    saved = await prisma.$transaction(async (tx) => {
      const latest = await tx.resumeVersion.findFirst({ where: { resumeId }, orderBy: { version: "desc" } });
      const updated = await tx.resume.update({ where: { id: resumeId }, data });
      await tx.resumeVersion.create({ data: { resumeId, version: (latest?.version || 0) + 1, title: updated.title, template: updated.template, content: updated.content as Prisma.InputJsonValue, coverLetter: updated.coverLetter } });
      return updated;
    });
  } else {
    saved = await prisma.$transaction(async (tx) => {
      const created = await tx.resume.create({ data: { profileId: profile.id, ...data } });
      await tx.resumeVersion.create({ data: { resumeId: created.id, version: 1, title: created.title, template: created.template, content: created.content as Prisma.InputJsonValue, coverLetter: created.coverLetter } });
      return created;
    });
  }

  await prisma.notification.create({
    data: {
      profileId: profile.id,
      type: "SYSTEM",
      title: "Resume saved",
      body: "Your SOUP resume and cover letter are ready in My SOUP.",
      href: `/resume/manage?id=${saved.id}`,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/resume");
  return { id: saved.id };
}

export async function deleteResume(resumeId: string) {
  const { profile } = await requireProfile();
  const resume = await prisma.resume.findFirst({ where: { id: resumeId, profileId: profile.id } });
  if (!resume) throw new Error("Resume not found.");
  await prisma.resume.delete({ where: { id: resume.id } });
  revalidatePath("/resume");
  revalidatePath("/dashboard");
}

export async function restoreResumeVersion(resumeId: string, versionId: string) {
  const { profile } = await requireProfile();
  const resume = await prisma.resume.findFirst({ where: { id: resumeId, profileId: profile.id } });
  if (!resume) throw new Error("Resume not found.");
  const version = await prisma.resumeVersion.findFirst({ where: { id: versionId, resumeId } });
  if (!version) throw new Error("Resume version not found.");
  await prisma.$transaction(async (tx) => {
    const latest = await tx.resumeVersion.findFirst({ where: { resumeId }, orderBy: { version: "desc" } });
    await tx.resume.update({ where: { id: resumeId }, data: { title: version.title, template: version.template, content: version.content as Prisma.InputJsonValue, coverLetter: version.coverLetter } });
    await tx.resumeVersion.create({ data: { resumeId, version: (latest?.version || 0) + 1, title: version.title, template: version.template, content: version.content as Prisma.InputJsonValue, coverLetter: version.coverLetter } });
  });
  revalidatePath("/resume");
}
