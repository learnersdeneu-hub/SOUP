import { Header } from "@/components/Header";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { normalizeFundingDetails } from "@/lib/applications/coreProfile";
import { FundingDetailsForm } from "@/components/profile/FundingDetailsForm";

export default async function ProfileFundingPage() {
  const { profile } = await requireProfile();
  const studentCase = await prisma.studentCase.findUnique({ where: { profileId: profile.id }, select: { fundingDetails: true } });
  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn/>
      <FundingDetailsForm funding={normalizeFundingDetails(studentCase?.fundingDetails)}/>
    </div>
  );
}
