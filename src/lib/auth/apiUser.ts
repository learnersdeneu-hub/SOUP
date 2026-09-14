import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function getApiUser() {
  const supabase = createClient();
  const { data: { user: authUser }, error } = await supabase.auth.getUser();
  if (error || !authUser) return null;
  const user = await prisma.user.findUnique({ where: { id: authUser.id }, include: { profile: true } });
  if (!user) return null;
  return { authUser, user, profile: user.profile };
}

export async function requireApiUser() {
  const current = await getApiUser();
  if (!current) return { ok: false as const, response: Response.json({ error: "Sign in required." }, { status: 401 }) };
  return { ok: true as const, ...current };
}

export async function requireApiProfile() {
  const current = await requireApiUser();
  if (!current.ok) return current;
  if (!current.profile) return { ok: false as const, response: Response.json({ error: "Your SOUP profile is not ready yet." }, { status: 409 }) };
  return { ...current, profile: current.profile };
}
