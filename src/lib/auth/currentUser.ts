import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ensureUserAndProfile, AccessNotApprovedError } from "@/lib/auth/provision";
import type { AppRole } from "@prisma/client";

export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  let user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { profile: true },
  });

  // Self-heal accounts that authenticated successfully but were created before
  // the Prisma provisioning flow completed. This keeps Auth and Core identity
  // aligned without sending customers to a dead setup route.
  if (!user || !user.profile) {
    try {
      await ensureUserAndProfile(authUser);
    } catch (caught) {
      // A Supabase auth session exists (e.g. a stale/orphaned session from
      // before self-registration was removed, or a not-yet-approved access
      // request) but there's no approved request to back a first-time
      // profile. Sign the dead session out and treat this request as
      // signed-out, rather than letting the error crash every page that
      // calls requireCurrentUser/requireProfile/requireRole.
      if (caught instanceof AccessNotApprovedError) {
        await supabase.auth.signOut().catch(() => undefined);
        return null;
      }
      throw caught;
    }
    user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { profile: true },
    });
  }

  if (!user) return null;

  if (authUser.email) {
    const email = authUser.email.toLowerCase();
    const superAdmins = String(process.env.SOUP_SUPER_ADMIN_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
    const admins = String(process.env.SOUP_ADMIN_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
    const bootstrapRole = superAdmins.includes(email) ? "SUPER_ADMIN" : admins.includes(email) ? "ADMIN" : null;
    if (bootstrapRole && user.role !== bootstrapRole) {
      user = await prisma.user.update({ where: { id: user.id }, data: { role: bootstrapRole }, include: { profile: true } });
    }
  }

  return { authUser, user };
}

export async function requireCurrentUser() {
  const current = await getCurrentUser();
  if (!current) redirect("/sign-in");
  return current;
}

export async function requireProfile() {
  const current = await requireCurrentUser();
  if (!current.user.profile) {
    // Provisioning is attempted in getCurrentUser. Reaching this branch means
    // there is a genuine database/configuration problem rather than missing UI.
    throw new Error("Your SOUP profile could not be prepared. Please contact support.");
  }
  return { ...current, profile: current.user.profile };
}

export async function requireRole(roles: AppRole[]) {
  const current = await requireCurrentUser();
  if (!roles.includes(current.user.role)) redirect("/dashboard");
  return current;
}
