import { Header } from "@/components/Header";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { normalizeTestingDetails } from "@/lib/applications/coreProfile";
import { TestingDetailsForm } from "@/components/profile/TestingDetailsForm";
import { getCategoryDocumentsMap } from "@/lib/documents/categoryQuery";

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in (this app is used on
// shared/school devices) — see the fix and full explanation in
// src/app/actions/auth.ts (invalidateAuthenticatedPages). requireProfile()/
// requireRole() already force dynamic rendering implicitly via cookies(),
// but that is an implicit guarantee a future refactor could silently
// break; this makes it explicit and impossible to regress unnoticed.
export const dynamic = "force-dynamic";

export default async function ProfileTestingPage() {
  const { profile } = await requireProfile();
  const [studentCase, testingDocuments] = await Promise.all([
    prisma.studentCase.findUnique({ where: { profileId: profile.id }, select: { testingDetails: true } }),
    getCategoryDocumentsMap(profile.id, ["ENGLISH_TEST", "SAT_ACT_SCORE_REPORT", "GRADUATE_TEST_SCORE_REPORT"]),
  ]);
  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn/>
      <TestingDetailsForm
        testing={normalizeTestingDetails(studentCase?.testingDetails)}
        englishTestDocuments={testingDocuments.ENGLISH_TEST || []}
        satActDocuments={testingDocuments.SAT_ACT_SCORE_REPORT || []}
        graduateTestDocuments={testingDocuments.GRADUATE_TEST_SCORE_REPORT || []}
      />
    </div>
  );
}
