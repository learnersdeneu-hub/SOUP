"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/currentUser";
import { COMMERCIAL_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import type { ServiceReferralStatus } from "@prisma/client";

const STATUSES = new Set(["RECOMMENDED", "OPENED", "STARTED", "COMPLETED", "DECLINED", "EXTERNAL_ONLY"]);

function optionalMoney(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const number = Number(raw);
  if (!Number.isFinite(number) || number < 0) throw new Error("Commercial amounts must be non-negative numbers.");
  return number;
}

export async function updateReferralCommercials(referralId: string, formData: FormData) {
  const current = await requireRole(COMMERCIAL_ROLES);
  const existing = await prisma.serviceReferral.findUniqueOrThrow({ where: { id: referralId }, select: { profileId: true, convertedAt: true, type: true, status: true, title: true, partner: { select: { name: true } } } });
  if (current.user.role === "ACCOMMODATION" && existing.type !== "ACCOMMODATION") throw new Error("Accommodation staff can update accommodation referrals only.");
  if (current.user.role === "FINANCE" && !["STUDENT_FINANCE", "INSURANCE", "SCHOLARSHIP"].includes(existing.type)) throw new Error("Finance staff cannot update this referral type.");
  const status = String(formData.get("status") || "").trim();
  if (!STATUSES.has(status)) throw new Error("Invalid referral status.");

  const partnerReference = String(formData.get("partnerReference") || "").trim().slice(0, 240) || null;
  const revenueAmount = optionalMoney(formData.get("revenueAmount"));
  const commissionAmount = optionalMoney(formData.get("commissionAmount"));
  const revenueCurrency = String(formData.get("revenueCurrency") || "").trim().toUpperCase().slice(0, 8) || null;
  const commissionCurrency = String(formData.get("commissionCurrency") || "").trim().toUpperCase().slice(0, 8) || null;

  await prisma.serviceReferral.update({
    where: { id: referralId },
    data: {
      status: status as ServiceReferralStatus,
      partnerReference,
      revenueAmount,
      revenueCurrency,
      commissionAmount,
      commissionCurrency,
      convertedAt: status === "COMPLETED" ? existing.convertedAt || new Date() : existing.convertedAt,
    },
  });

  if (status === "COMPLETED" && existing.status !== "COMPLETED") {
    await prisma.notification.create({
      data: {
        profileId: existing.profileId,
        type: "SYSTEM",
        title: `${existing.partner?.name || existing.title} updated`,
        body: `Your ${existing.type.replaceAll("_", " ").toLowerCase()} service through SOUP has been marked complete.`,
        href: "/services/history",
      },
    });
  }

  revalidatePath("/admin/referrals");
  revalidatePath(`/admin/users/${existing.profileId}`);
  revalidatePath("/services/history");
  revalidatePath("/dashboard");
}

export async function saveStudentServiceNeeds(type: "ACCOMMODATION" | "INSURANCE", formData: FormData) {
  const { requireProfile } = await import("@/lib/auth/currentUser");
  const { ensureStudentCase } = await import("@/lib/student/case");
  const { profile } = await requireProfile();
  const studentCase = await ensureStudentCase(profile.id);
  const metadata: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    const cleaned = value.trim().slice(0, 300);
    if (cleaned) metadata[key] = cleaned;
  }
  if (!Object.keys(metadata).length) throw new Error("Add at least one preference so SOUP can save the request.");
  const title = type === "ACCOMMODATION" ? "Accommodation preferences" : "Insurance preferences";
  const existing = await prisma.serviceReferral.findFirst({ where: { profileId: profile.id, type, partnerId: null, status: { in: ["RECOMMENDED", "OPENED", "STARTED"] }, title }, orderBy: { updatedAt: "desc" } });
  if (existing) await prisma.serviceReferral.update({ where: { id: existing.id }, data: { status: "STARTED", metadata } });
  else await prisma.serviceReferral.create({ data: { profileId: profile.id, studentCaseId: studentCase.id, type, status: "STARTED", title, counselorRationale: "Student saved service preferences directly in My SOUP.", metadata } });
  await prisma.notification.create({ data: { profileId: profile.id, type: "SYSTEM", title: `${type === "ACCOMMODATION" ? "Accommodation" : "Insurance"} preferences saved`, body: "SOUP will use these preferences across Noodles and your service journey.", href: type === "ACCOMMODATION" ? "/services/accommodation" : "/services/insurance" } });
  revalidatePath(type === "ACCOMMODATION" ? "/services/accommodation" : "/services/insurance");
  revalidatePath("/dashboard");
}
