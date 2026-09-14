"use server";

import type { AppRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/currentUser";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

const ALL_ROLES = new Set<AppRole>(["CUSTOMER", "COUNSELOR", "ADMISSIONS", "FINANCE", "ACCOMMODATION", "SUPPORT", "ADMIN", "SUPER_ADMIN"]);
const ADMIN_ASSIGNABLE = new Set<AppRole>(["CUSTOMER", "COUNSELOR", "ADMISSIONS", "FINANCE", "ACCOMMODATION", "SUPPORT"]);

export async function updateUserRole(userId: string, formData: FormData) {
  const current = await requireRole(ADMIN_ROLES);
  const role = String(formData.get("role") || "") as AppRole;
  if (!ALL_ROLES.has(role)) throw new Error("Unknown SOUP role.");
  if (current.user.role !== "SUPER_ADMIN" && !ADMIN_ASSIGNABLE.has(role)) {
    throw new Error("Only a Super Admin can assign Admin or Super Admin roles.");
  }
  if (current.user.id === userId && role === "CUSTOMER") {
    throw new Error("Do not remove your own staff access from this screen.");
  }

  const target = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { profile: { select: { id: true } } } });
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
  if (target.profile?.id) revalidatePath(`/admin/users/${target.profile.id}`);
}
