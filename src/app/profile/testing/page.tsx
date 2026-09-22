import { Header } from "@/components/Header";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { normalizeTestingDetails } from "@/lib/applications/coreProfile";
import { TestingDetailsForm } from "@/components/profile/TestingDetailsForm";

export default async function ProfileTestingPage() {
  const { profile } = await requireProfile();
  const studentCase = await prisma.studentCase.findUnique({ where: { profileId: profile.id }, select: { testingDetails: true } });
  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn/>
      <TestingDetailsForm testing={normalizeTestingDetails(studentCase?.testingDetails)}/>
    </div>
  );
}
