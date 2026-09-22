import { Header } from "@/components/Header";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { normalizeCoreProfileDetails } from "@/lib/applications/coreProfile";
import { ProfileDetailsForm } from "@/components/profile/ProfileDetailsForm";

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
