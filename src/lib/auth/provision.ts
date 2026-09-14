import type { User as SupabaseUser } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

function displayName(authUser: SupabaseUser, fallback?: string) {
  const metadataName = typeof authUser.user_metadata?.full_name === "string" ? authUser.user_metadata.full_name.trim() : "";
  const supplied = fallback?.trim() || "";
  const emailPrefix = authUser.email?.split("@")[0] || "SOUP Student";
  return supplied || metadataName || emailPrefix;
}

function configuredEmails(name: string) {
  return String(process.env[name] || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function configuredBootstrapRole(email: string) {
  const normalized = email.trim().toLowerCase();
  if (configuredEmails("SOUP_SUPER_ADMIN_EMAILS").includes(normalized)) return "SUPER_ADMIN" as const;
  if (configuredEmails("SOUP_ADMIN_EMAILS").includes(normalized)) return "ADMIN" as const;
  return null;
}

export async function ensureUserAndProfile(authUser: SupabaseUser, fullName?: string) {
  if (!authUser.email) throw new Error("The authenticated account has no email address.");
  const bootstrapRole = configuredBootstrapRole(authUser.email);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { id: authUser.id },
      update: {
        email: authUser.email!,
        fullName: displayName(authUser, fullName),
        lastLoginAt: new Date(),
        ...(bootstrapRole ? { role: bootstrapRole } : {}),
      },
      create: {
        id: authUser.id,
        email: authUser.email!,
        fullName: displayName(authUser, fullName),
        authProvider: "supabase",
        lastLoginAt: new Date(),
        ...(bootstrapRole ? { role: bootstrapRole } : {}),
      },
    });
    const profile = await tx.profile.upsert({ where: { userId: authUser.id }, update: {}, create: { userId: authUser.id } });
    return { user, profile };
  });
}
