import type { User as SupabaseUser } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

function displayName(authUser: SupabaseUser, fallback?: string) {
  const metadataName = typeof authUser.user_metadata?.full_name === "string" ? authUser.user_metadata.full_name.trim() : "";
  const supplied = fallback?.trim() || "";
  const emailPrefix = authUser.email?.split("@")[0] || "SOUP Student";
  return supplied || metadataName || emailPrefix;
}

function metadataInstitutionName(authUser: SupabaseUser) {
  const value = authUser.user_metadata?.institution_name;
  return typeof value === "string" ? value.trim().slice(0, 200) : "";
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

// institutionName intentionally has different create-vs-update semantics
// from fullName: it is set from signup metadata (or an explicit override) on
// creation, but is never blindly re-applied from Supabase user_metadata on
// every later login — Supabase's OTP metadata reflects whatever was true at
// original account creation and doesn't track later edits, so re-applying it
// on each sign-in could silently overwrite an institution name the student
// later changed on /account. It is only backfilled on an existing row when
// that row genuinely has none yet (a pre-existing account catching up).
export async function ensureUserAndProfile(authUser: SupabaseUser, fullName?: string, institutionNameOverride?: string) {
  if (!authUser.email) throw new Error("The authenticated account has no email address.");
  const bootstrapRole = configuredBootstrapRole(authUser.email);
  const institutionFromSignup = institutionNameOverride?.trim().slice(0, 200) || metadataInstitutionName(authUser) || null;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { id: authUser.id }, select: { institutionName: true } });
    const institutionUpdate = !existing?.institutionName && institutionFromSignup ? { institutionName: institutionFromSignup } : {};

    const user = await tx.user.upsert({
      where: { id: authUser.id },
      update: {
        email: authUser.email!,
        fullName: displayName(authUser, fullName),
        lastLoginAt: new Date(),
        ...institutionUpdate,
        ...(bootstrapRole ? { role: bootstrapRole } : {}),
      },
      create: {
        id: authUser.id,
        email: authUser.email!,
        fullName: displayName(authUser, fullName),
        authProvider: "supabase",
        institutionName: institutionFromSignup,
        lastLoginAt: new Date(),
        ...(bootstrapRole ? { role: bootstrapRole } : {}),
      },
    });
    const profile = await tx.profile.upsert({ where: { userId: authUser.id }, update: {}, create: { userId: authUser.id } });
    return { user, profile };
  });
}
