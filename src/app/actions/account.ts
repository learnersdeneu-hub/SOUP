"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/auth/currentUser";

function clean(value: FormDataEntryValue | null, max = 160) {
  const text = String(value || "").trim();
  return text ? text.slice(0, max) : null;
}

function parseDateOfBirth(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function updateCustomerProfile(formData: FormData) {
  const { user, profile } = await requireProfile();
  const fullName = clean(formData.get("fullName"), 120);
  if (!fullName) throw new Error("Your name is required.");
  const dateOfBirth = parseDateOfBirth(formData.get("dateOfBirth"));
  // Only ever tracked through this action and the direct application form on
  // a university page — both write the same fields so "core application
  // information" (see missingCoreApplicationInformation) is completed once,
  // in one place, rather than only being fillable through a Noodles chat.
  const academicBackgroundSummary = clean(formData.get("academicBackgroundSummary"), 600);

  // institutionName is only touched when the submitting form actually has
  // the field (the /account settings form does; UniversityApplyPanel and
  // ApplicantInfoForm, which also call this same action, do not) — checking
  // formData.has() rather than the cleaned value's truthiness means those
  // other callers can never silently blank out an institution name just by
  // submitting a form that was never asking about it.
  const institutionNameProvided = formData.has("institutionName");
  const institutionName = clean(formData.get("institutionName"), 200);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        fullName,
        nationality: clean(formData.get("nationality"), 80),
        currentCountry: clean(formData.get("currentCountry"), 80),
        ...(dateOfBirth ? { dateOfBirth } : {}),
        ...(institutionNameProvided && institutionName ? { institutionName } : {}),
      },
    }),
    prisma.profile.update({
      where: { id: profile.id },
      data: { headlineSummary: clean(formData.get("headlineSummary"), 240) },
    }),
    prisma.studentCase.upsert({
      where: { profileId: profile.id },
      update: { academicBackgroundSummary },
      create: { profileId: profile.id, academicBackgroundSummary },
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
