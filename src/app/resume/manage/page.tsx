import { Header } from "@/components/Header";
import { ResumeBuilder } from "@/components/resume/ResumeBuilder";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in (this app is used on
// shared/school devices) — see the fix and full explanation in
// src/app/actions/auth.ts (invalidateAuthenticatedPages). requireProfile()/
// requireRole() already force dynamic rendering implicitly via cookies(),
// but that is an implicit guarantee a future refactor could silently
// break; this makes it explicit and impossible to regress unnoticed.
export const dynamic = "force-dynamic";

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
