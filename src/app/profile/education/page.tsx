import { Header } from "@/components/Header";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { normalizeEducationHistory } from "@/lib/applications/coreProfile";
import { EducationHistoryForm } from "@/components/profile/EducationHistoryForm";

export default async function ProfileEducationPage() {
  const { profile } = await requireProfile();
  const studentCase = await prisma.studentCase.findUnique({ where: { profileId: profile.id }, select: { educationHistory: true } });
  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn/>
      <EducationHistoryForm education={normalizeEducationHistory(studentCase?.educationHistory)}/>
    </div>
  );
}
