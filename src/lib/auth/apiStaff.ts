import type { AppRole } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/auth/roles";

export async function getApiStaff(roles: AppRole[] = STAFF_ROLES) {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;
  const user = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (!user || !roles.includes(user.role)) return null;
  return { authUser, user };
}
