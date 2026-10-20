"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/auth/currentUser";
import { ACTIVITY_TYPES, MAX_ACTIVITIES, ACTIVITY_DESCRIPTION_MAX_CHARS } from "@/lib/applications/activityTypes";
import { updateExtracurricularMeta } from "@/lib/applications/extracurricularMeta";

function clean(value: FormDataEntryValue | null, max = 200) {
  const text = String(value || "").trim();
  return text ? text.slice(0, max) : "";
}
function cleanInt(value: FormDataEntryValue | null, min: number, max: number) {
  const raw = clean(value, 6);
  if (!raw) return null;
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(min, Math.min(max, parsed));
}

export async function addActivity(formData: FormData) {
  const { profile } = await requireProfile();
  const count = await prisma.studentActivity.count({ where: { profileId: profile.id } });
  if (count >= MAX_ACTIVITIES) throw new Error(`You can add up to ${MAX_ACTIVITIES} activities.`);

  const activityType = clean(formData.get("activityType"), 60) || ACTIVITY_TYPES[0];
  const ongoing = clean(formData.get("ongoing")) === "true";
  await prisma.studentActivity.create({
    data: {
      profileId: profile.id,
      position: count,
      activityType,
      roleTitle: clean(formData.get("roleTitle"), 120) || null,
      organization: clean(formData.get("organization"), 160) || null,
      description: clean(formData.get("description"), ACTIVITY_DESCRIPTION_MAX_CHARS) || null,
      startDate: clean(formData.get("startDate"), 10) || null,
      endDate: ongoing ? null : clean(formData.get("endDate"), 10) || null,
      ongoing,
      hoursPerWeek: cleanInt(formData.get("hoursPerWeek"), 0, 168),
      weeksPerYear: cleanInt(formData.get("weeksPerYear"), 0, 52),
    },
  });
  // Adding a real activity supersedes any earlier "no activities to add" confirmation.
  await updateExtracurricularMeta(profile.id, { noActivitiesConfirmed: false });
  revalidatePath("/dashboard");
  revalidatePath("/profile/extracurricular");
}

export async function updateActivity(formData: FormData) {
  const { profile } = await requireProfile();
  const id = clean(formData.get("id"), 60);
  if (!id) throw new Error("Missing activity id.");
  const existing = await prisma.studentActivity.findFirst({ where: { id, profileId: profile.id } });
  if (!existing) throw new Error("Activity not found.");

  const ongoing = clean(formData.get("ongoing")) === "true";
  await prisma.studentActivity.update({
    where: { id },
    data: {
      activityType: clean(formData.get("activityType"), 60) || existing.activityType,
      roleTitle: clean(formData.get("roleTitle"), 120) || null,
      organization: clean(formData.get("organization"), 160) || null,
      description: clean(formData.get("description"), ACTIVITY_DESCRIPTION_MAX_CHARS) || null,
      startDate: clean(formData.get("startDate"), 10) || null,
      endDate: ongoing ? null : clean(formData.get("endDate"), 10) || null,
      ongoing,
      hoursPerWeek: cleanInt(formData.get("hoursPerWeek"), 0, 168),
      weeksPerYear: cleanInt(formData.get("weeksPerYear"), 0, 52),
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/profile/extracurricular");
}

export async function removeActivity(formData: FormData) {
  const { profile } = await requireProfile();
  const id = clean(formData.get("id"), 60);
  if (!id) throw new Error("Missing activity id.");
  await prisma.studentActivity.deleteMany({ where: { id, profileId: profile.id } });
  // Renumber remaining positions so a future reorder stays contiguous.
  const remaining = await prisma.studentActivity.findMany({ where: { profileId: profile.id }, orderBy: { position: "asc" } });
  await prisma.$transaction(remaining.map((activity, index) => prisma.studentActivity.update({ where: { id: activity.id }, data: { position: index } })));
  revalidatePath("/dashboard");
  revalidatePath("/profile/extracurricular");
}

export async function reorderActivity(formData: FormData) {
  const { profile } = await requireProfile();
  const id = clean(formData.get("id"), 60);
  const direction = clean(formData.get("direction"), 10);
  const activities = await prisma.studentActivity.findMany({ where: { profileId: profile.id }, orderBy: { position: "asc" } });
  const index = activities.findIndex((activity) => activity.id === id);
  if (index === -1) return;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= activities.length) return;
  await prisma.$transaction([
    prisma.studentActivity.update({ where: { id: activities[index].id }, data: { position: swapWith } }),
    prisma.studentActivity.update({ where: { id: activities[swapWith].id }, data: { position: index } }),
  ]);
  revalidatePath("/profile/extracurricular");
}

export async function setNoActivitiesConfirmed(formData: FormData) {
  const { profile } = await requireProfile();
  const confirmed = clean(formData.get("confirmed")) === "true";
  await updateExtracurricularMeta(profile.id, { noActivitiesConfirmed: confirmed });
  revalidatePath("/dashboard");
  revalidatePath("/profile/extracurricular");
}
