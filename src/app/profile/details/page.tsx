import { Header } from "@/components/Header";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { normalizeCoreProfileDetails } from "@/lib/applications/coreProfile";
import { ProfileDetailsForm } from "@/components/profile/ProfileDetailsForm";

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in (this app is used on
// shared/school devices) — see the fix and full explanation in
// src/app/actions/auth.ts (invalidateAuthenticatedPages). requireProfile()/
// requireRole() already force dynamic rendering implicitly via cookies(),
// but that is an implicit guarantee a future refactor could silently
// break; this makes it explicit and impossible to regress unnoticed.
export const dynamic = "force-dynamic";

export default async function ProfileDetailsPage() {
  const { user, profile } = await requireProfile();
  const studentCase = await prisma.studentCase.findUnique({ where: { profileId: profile.id }, select: { coreProfileDetails: true } });
  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn/>
      <ProfileDetailsForm
        core={normalizeCoreProfileDetails(studentCase?.coreProfileDetails)}
        fullName={user.fullName || ""}
        dateOfBirth={user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : ""}
        nationality={user.nationality || ""}
        currentCountry={user.currentCountry || ""}
      />
    </div>
  );
}
