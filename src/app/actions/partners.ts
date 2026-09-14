"use server";

import type { PartnerType, PartnershipStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/currentUser";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { safeHttpUrl } from "@/lib/security/urls";

const PARTNER_TYPES = new Set<PartnerType>(["UNIVERSITY", "ACCOMMODATION", "INSURANCE", "STUDENT_FINANCE", "SCHOLARSHIP", "TRAVEL", "OTHER"]);
const PARTNER_STATUSES = new Set<PartnershipStatus>(["ACTIVE", "PAUSED", "INACTIVE"]);

function optionalText(value: FormDataEntryValue | null, max = 300) {
  const text = String(value || "").trim();
  return text ? text.slice(0, max) : null;
}

function optionalHttpUrl(value: FormDataEntryValue | null) {
  const text = optionalText(value, 1200);
  if (!text) return null;
  const safe = safeHttpUrl(text, 1200);
  if (!safe) throw new Error("Partner URLs must be credential-free https:// or http:// URLs.");
  return safe;
}

function priorityValue(value: FormDataEntryValue | null) {
  const raw = String(value || "100").trim();
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10000) throw new Error("Internal priority must be a whole number from 0 to 10000.");
  return parsed;
}

export async function updatePartner(partnerId: string, formData: FormData) {
  await requireRole(ADMIN_ROLES);
  const existing = await prisma.partner.findUniqueOrThrow({ where: { id: partnerId }, select: { id: true, type: true } });
  const status = String(formData.get("status") || "") as PartnershipStatus;
  if (!PARTNER_STATUSES.has(status)) throw new Error("Invalid partner status.");

  const transactionUrl = optionalHttpUrl(formData.get("transactionUrl"));
  if (existing.type !== "UNIVERSITY" && status === "ACTIVE" && !transactionUrl) {
    throw new Error("An active service partner needs a transaction/referral URL before SOUP can route students to it.");
  }

  await prisma.partner.update({
    where: { id: partnerId },
    data: {
      status,
      country: optionalText(formData.get("country"), 120),
      city: optionalText(formData.get("city"), 120),
      websiteUrl: optionalHttpUrl(formData.get("websiteUrl")),
      transactionUrl,
      internalPriority: priorityValue(formData.get("internalPriority")),
    },
  });

  revalidatePath("/admin/partners");
  revalidatePath(`/admin/partners/${partnerId}`);
  revalidatePath("/services");
}

export async function createServicePartner(formData: FormData) {
  await requireRole(ADMIN_ROLES);
  const type = String(formData.get("type") || "") as PartnerType;
  if (!PARTNER_TYPES.has(type) || type === "UNIVERSITY") throw new Error("Use the university catalog import for university partners.");
  const name = optionalText(formData.get("name"), 240);
  if (!name) throw new Error("Partner name is required.");
  const transactionUrl = optionalHttpUrl(formData.get("transactionUrl"));
  if (!transactionUrl) throw new Error("A service partner needs a transaction/referral URL before it can be active in SOUP.");

  const base = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "partner";
  let slug = base;
  let suffix = 2;
  while (await prisma.partner.findUnique({ where: { slug }, select: { id: true } })) slug = `${base}-${suffix++}`;

  await prisma.partner.create({
    data: {
      type,
      name,
      slug,
      status: "ACTIVE",
      country: optionalText(formData.get("country"), 120),
      city: optionalText(formData.get("city"), 120),
      websiteUrl: optionalHttpUrl(formData.get("websiteUrl")),
      transactionUrl,
      internalPriority: priorityValue(formData.get("internalPriority")),
      publicMetadata: { source: "SOUP_ADMIN" },
    },
  });

  revalidatePath("/admin/partners");
}
