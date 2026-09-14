import { Header } from "@/components/Header";
import { ResumeBuilder } from "@/components/resume/ResumeBuilder";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";

export default async function ManageResumePage({ searchParams }: { searchParams: { id?: string } }) {
  const { profile } = await requireProfile();
  const resumes = await prisma.resume.findMany({
    where: { profileId: profile.id, status: { not: "ARCHIVED" } },
    include: { versions: { orderBy: { version: "desc" }, take: 20 } },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn />
      <main className="mx-auto max-w-6xl px-5 pb-12 pt-5 sm:px-8">
        <ResumeBuilder signedIn existing={resumes} selectedId={searchParams.id || null} manageOnly />
      </main>
    </div>
  );
}
