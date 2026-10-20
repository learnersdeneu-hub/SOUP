import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { normalizeWritingDetails, normalizeExtracurricularMeta } from "@/lib/applications/coreProfile";
import { computeWritingRequirement } from "@/lib/applications/writingRequirement";
import { getCategoryDocumentsMap } from "@/lib/documents/categoryQuery";
import { ActivitiesForm } from "@/components/profile/ActivitiesForm";
import { RecommendersForm } from "@/components/profile/RecommendersForm";
import { WritingDraftForm } from "@/components/profile/WritingDraftForm";
import { ProfileSectionNav } from "@/components/profile/ProfileSectionNav";

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in — see the fix and full
// explanation in src/app/actions/auth.ts (invalidateAuthenticatedPages).
export const dynamic = "force-dynamic";

export default async function ProfileExtracurricularPage() {
  const { profile } = await requireProfile();
  const [studentCase, activities, recommenders, readyResumeCount, categoryDocuments, applications] = await Promise.all([
    prisma.studentCase.findUnique({ where: { profileId: profile.id }, select: { writingDetails: true, extracurricularMeta: true } }),
    prisma.studentActivity.findMany({ where: { profileId: profile.id }, orderBy: { position: "asc" } }),
    prisma.recommender.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "asc" } }),
    prisma.resume.count({ where: { profileId: profile.id, status: "READY" } }),
    getCategoryDocumentsMap(profile.id, ["RESUME_CV", "MOTIVATION_LETTER", "PERSONAL_STATEMENT"]),
    prisma.studentApplication.findMany({ where: { profileId: profile.id }, select: { university: { select: { country: true } } } }),
  ]);

  const writingDetails = normalizeWritingDetails(studentCase?.writingDetails);
  const extracurricularMeta = normalizeExtracurricularMeta(studentCase?.extracurricularMeta);
  const writingRequirement = computeWritingRequirement(applications);

  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn/>
      <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs font-semibold text-navy"><ArrowLeft size={12}/>Dashboard</Link>
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">My Application Progress · Section 3</div>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Extracurricular & Recommendations</h1>
          <p className="mt-2 text-sm leading-6 text-mute">Fill this in once — it's reused across every university application you start.</p>
        </div>

        <ActivitiesForm
          activities={activities}
          noActivitiesConfirmed={extracurricularMeta.noActivitiesConfirmed}
          resumeDocuments={categoryDocuments.RESUME_CV || []}
          readyResumeCount={readyResumeCount}
        />

        <RecommendersForm recommenders={recommenders} recommendersNotRequiredConfirmed={extracurricularMeta.recommendersNotRequiredConfirmed}/>

        <WritingDraftForm
          motivationLetter={writingDetails.motivationLetter}
          personalStatement={writingDetails.personalStatement}
          motivationLetterRequired={writingRequirement.motivationLetterRequired}
          personalStatementRequired={writingRequirement.personalStatementRequired}
          motivationLetterDocuments={categoryDocuments.MOTIVATION_LETTER || []}
          personalStatementDocuments={categoryDocuments.PERSONAL_STATEMENT || []}
        />

        <ProfileSectionNav current="/profile/extracurricular"/>
      </div>
    </div>
  );
}
