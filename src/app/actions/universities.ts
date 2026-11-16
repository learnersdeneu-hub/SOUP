"use server";

import { Prisma, type PartnershipStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/currentUser";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { safeHttpUrl } from "@/lib/security/urls";

// Same lighter convention as src/app/actions/partners.ts — plain FormData
// reads with manual validation, not the zod/schemas.ts layer (that's for
// public API routes only). Kept deliberately parallel so staff who already
// know the partner-editing screen recognize this one immediately.
const PARTNER_STATUSES = new Set<PartnershipStatus>(["ACTIVE", "PAUSED", "INACTIVE"]);

function requiredText(value: FormDataEntryValue | null, label: string, max = 240) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${label} is required.`);
  return text.slice(0, max);
}

function optionalText(value: FormDataEntryValue | null, max = 300) {
  const text = String(value || "").trim();
  return text ? text.slice(0, max) : null;
}

function optionalHttpUrl(value: FormDataEntryValue | null, label: string) {
  const text = optionalText(value, 1200);
  if (!text) return null;
  const safe = safeHttpUrl(text, 1200);
  if (!safe) throw new Error(`${label} must be a credential-free https:// or http:// URL.`);
  return safe;
}

function optionalMoney(value: FormDataEntryValue | null, label: string) {
  const text = String(value || "").trim();
  if (!text) return null;
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < 0) throw new Error(`${label} must be a non-negative number.`);
  return amount;
}

function slugify(name: string) {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "university";
}

async function uniquePartnerSlug(name: string) {
  const base = `university-${slugify(name)}`;
  let slug = base;
  let suffix = 2;
  while (await prisma.partner.findUnique({ where: { slug }, select: { id: true } })) slug = `${base}-${suffix++}`;
  return slug;
}

function mergeLogoMetadata(existing: Prisma.JsonValue | null, logoUrl: string | null): Prisma.InputJsonValue | undefined {
  const base = existing && typeof existing === "object" && !Array.isArray(existing) ? { ...(existing as Record<string, unknown>) } : {};
  if (logoUrl) base.logoUrl = logoUrl;
  else delete base.logoUrl;
  return Object.keys(base).length ? (base as Prisma.InputJsonValue) : undefined;
}

// Creates the University row and, only when staff opt in, a linked Partner
// (type UNIVERSITY, status ACTIVE) in the same transaction — this is the one
// thing that actually turns on SOUP-managed applications for it (see
// src/app/api/applications/route.ts's isActivePartnerUniversity check,
// unchanged by this action).
export async function createUniversity(formData: FormData) {
  await requireRole(ADMIN_ROLES);

  const name = requiredText(formData.get("name"), "University name");
  const country = requiredText(formData.get("country"), "Country", 120);
  const city = optionalText(formData.get("city"), 120);
  const websiteUrl = optionalHttpUrl(formData.get("websiteUrl"), "Website URL");
  const logoUrl = optionalHttpUrl(formData.get("logoUrl"), "Logo URL");
  const isPublic = formData.get("visible") === "on";
  const manageApplications = formData.get("manageApplications") === "on";

  const existing = await prisma.university.findUnique({ where: { name_country: { name, country } }, select: { id: true } });
  if (existing) throw new Error(`${name} already exists for ${country} — edit that record instead of creating a duplicate.`);

  const university = await prisma.$transaction(async (tx) => {
    let partnerId: string | null = null;
    if (manageApplications) {
      const partner = await tx.partner.create({
        data: {
          type: "UNIVERSITY",
          name,
          slug: await uniquePartnerSlug(name),
          status: "ACTIVE",
          country,
          city,
          websiteUrl,
          internalPriority: 100,
          publicMetadata: { source: "SOUP_ADMIN_UNIVERSITY_CATALOG" },
        },
      });
      partnerId = partner.id;
    }
    return tx.university.create({
      data: {
        name,
        country,
        city,
        websiteUrl,
        isPublic,
        partnerId,
        publicMetadata: mergeLogoMetadata(null, logoUrl) ?? Prisma.JsonNull,
      },
    });
  });

  revalidatePath("/admin/universities");
  revalidatePath("/universities");
  revalidatePath(`/admin/universities/${university.id}`);
}

// Edits the University row's own fields and, if it already has (or should
// now get) a linked Partner, that Partner's status in the same form — today
// those live on two separate screens (nowhere, and /admin/partners/[id]);
// this unifies them into the one place staff actually think of as "this
// university's settings."
export async function updateUniversity(universityId: string, formData: FormData) {
  await requireRole(ADMIN_ROLES);
  const university = await prisma.university.findUniqueOrThrow({ where: { id: universityId }, include: { partner: true } });

  const name = requiredText(formData.get("name"), "University name");
  const country = requiredText(formData.get("country"), "Country", 120);
  const city = optionalText(formData.get("city"), 120);
  const websiteUrl = optionalHttpUrl(formData.get("websiteUrl"), "Website URL");
  const logoUrl = optionalHttpUrl(formData.get("logoUrl"), "Logo URL");
  const isPublic = formData.get("visible") === "on";
  const manageApplications = formData.get("manageApplications") === "on";
  const partnerStatus = String(formData.get("partnerStatus") || "ACTIVE") as PartnershipStatus;
  if (!PARTNER_STATUSES.has(partnerStatus)) throw new Error("Invalid application status.");

  await prisma.$transaction(async (tx) => {
    let partnerId = university.partnerId;
    if (manageApplications && !partnerId) {
      const partner = await tx.partner.create({
        data: {
          type: "UNIVERSITY",
          name,
          slug: await uniquePartnerSlug(name),
          status: partnerStatus,
          country,
          city,
          websiteUrl,
          internalPriority: university.partner?.internalPriority ?? 100,
          publicMetadata: { source: "SOUP_ADMIN_UNIVERSITY_CATALOG" },
        },
      });
      partnerId = partner.id;
    } else if (partnerId) {
      // Staff can turn applications fully off by switching the partner
      // status to INACTIVE below rather than detaching the partner record —
      // this keeps the one Partner row's history/slug stable instead of
      // creating a new one if they flip it back on later.
      await tx.partner.update({
        where: { id: partnerId },
        data: { name, status: manageApplications ? partnerStatus : "INACTIVE", country, city, websiteUrl },
      });
    }

    await tx.university.update({
      where: { id: universityId },
      data: {
        name,
        country,
        city,
        websiteUrl,
        isPublic,
        partnerId,
        publicMetadata: mergeLogoMetadata(university.publicMetadata, logoUrl) ?? Prisma.JsonNull,
      },
    });
  });

  revalidatePath("/admin/universities");
  revalidatePath(`/admin/universities/${universityId}`);
  revalidatePath("/universities");
  revalidatePath(`/universities/${universityId}`);
}

function programFieldsFromForm(formData: FormData, existingRequirements: Prisma.JsonValue | null) {
  const applicationFeeAmount = optionalMoney(formData.get("applicationFeeAmount"), "Application fee");
  const applicationFeeCurrency = optionalText(formData.get("applicationFeeCurrency"), 3)?.toUpperCase() || null;
  const base = existingRequirements && typeof existingRequirements === "object" && !Array.isArray(existingRequirements)
    ? { ...(existingRequirements as Record<string, unknown>) }
    : {};
  if (applicationFeeAmount != null && applicationFeeCurrency) {
    base.applicationFeeAmount = applicationFeeAmount;
    base.applicationFeeCurrency = applicationFeeCurrency;
  } else {
    delete base.applicationFeeAmount;
    delete base.applicationFeeCurrency;
  }
  const requirements = Object.keys(base).length ? (base as Prisma.InputJsonValue) : Prisma.JsonNull;

  return {
    title: requiredText(formData.get("title"), "Program title"),
    level: requiredText(formData.get("level"), "Study level", 60),
    field: optionalText(formData.get("field"), 120),
    studyMode: optionalText(formData.get("studyMode"), 60),
    language: optionalText(formData.get("language"), 60),
    duration: optionalText(formData.get("duration"), 60),
    tuitionAmount: optionalMoney(formData.get("tuitionAmount"), "Tuition"),
    tuitionCurrency: optionalText(formData.get("tuitionCurrency"), 3)?.toUpperCase() || null,
    intake: optionalText(formData.get("intake"), 60),
    applicationDeadline: optionalText(formData.get("applicationDeadline"), 60),
    applicationUrl: optionalHttpUrl(formData.get("applicationUrl"), "Application URL"),
    active: formData.get("active") === "on",
    requirements,
  };
}

export async function createProgram(universityId: string, formData: FormData) {
  await requireRole(ADMIN_ROLES);
  await prisma.university.findUniqueOrThrow({ where: { id: universityId }, select: { id: true } });
  const data = programFieldsFromForm(formData, null);
  await prisma.universityProgram.create({ data: { ...data, universityId } });
  revalidatePath(`/admin/universities/${universityId}`);
  revalidatePath(`/universities/${universityId}`);
}

export async function updateProgram(programId: string, formData: FormData) {
  await requireRole(ADMIN_ROLES);
  const existing = await prisma.universityProgram.findUniqueOrThrow({ where: { id: programId }, select: { universityId: true, requirements: true } });
  const data = programFieldsFromForm(formData, existing.requirements);
  await prisma.universityProgram.update({ where: { id: programId }, data });
  revalidatePath(`/admin/universities/${existing.universityId}`);
  revalidatePath(`/universities/${existing.universityId}`);
}
