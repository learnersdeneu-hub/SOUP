"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/auth/currentUser";

function clean(value: FormDataEntryValue | null, max = 160) {
  const text = String(value || "").trim();
  return text ? text.slice(0, max) : null;
}

export async function updateCustomerProfile(formData: FormData) {
  const { user, profile } = await requireProfile();
  const fullName = clean(formData.get("fullName"), 120);
  if (!fullName) throw new Error("Your name is required.");

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        fullName,
        nationality: clean(formData.get("nationality"), 80),
        currentCountry: clean(formData.get("currentCountry"), 80),
      },
    }),
    prisma.profile.update({
      where: { id: profile.id },
      data: { headlineSummary: clean(formData.get("headlineSummary"), 240) },
    }),
  ]);

  revalidatePath("/account");
  revalidatePath("/dashboard");
}

export async function updateCommunicationPreferences(formData: FormData) {
  const { profile } = await requireProfile();
  const preferences = {
    emailImportant: formData.get("emailImportant") === "on",
    emailGeneral: formData.get("emailGeneral") === "on",
    whatsappImportant: formData.get("whatsappImportant") === "on",
    inAppAll: true,
  };
  await prisma.profile.update({ where: { id: profile.id }, data: { communicationPreferences: preferences } });
  revalidatePath("/account");
}
