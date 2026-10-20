import { Header } from "@/components/Header";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { normalizeEducationHistory } from "@/lib/applications/coreProfile";
import { EducationHistoryForm } from "@/components/profile/EducationHistoryForm";
import { getCategoryDocumentsMap } from "@/lib/documents/categoryQuery";
import { DOCUMENT_CATEGORIES } from "@/lib/documents/categories";

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in (this app is used on
// shared/school devices) — see the fix and full explanation in
// src/app/actions/auth.ts (invalidateAuthenticatedPages). requireProfile()/
// requireRole() already force dynamic rendering implicitly via cookies(),
// but that is an implicit guarantee a future refactor could silently
// break; this makes it explicit and impossible to regress unnoticed.
export const dynamic = "force-dynamic";

const EDUCATION_CATEGORIES = [
  "HS_TRANSCRIPT", "HS_DIPLOMA", "BACHELORS_TRANSCRIPT", "BACHELORS_DEGREE_CERTIFICATE", "MASTERS_TRANSCRIPT", "MASTERS_DEGREE_CERTIFICATE",
] as const satisfies typeof DOCUMENT_CATEGORIES[number][];

export default async function ProfileEducationPage() {
  const { profile } = await requireProfile();
  const [studentCase, educationDocuments, legacyDocuments] = await Promise.all([
    prisma.studentCase.findUnique({ where: { profileId: profile.id }, select: { educationHistory: true } }),
    getCategoryDocumentsMap(profile.id, [...EDUCATION_CATEGORIES]),
    // Documents uploaded through the old Standard Documents flow under the
    // old, degree-level-agnostic classes — see
    // LegacyDocumentReassignPrompt and plan decision #2.
    prisma.document.findMany({
      where: { profileId: profile.id, documentType: { in: ["ACADEMIC_TRANSCRIPT", "DEGREE_CERTIFICATE"] } },
      select: { id: true, originalFileName: true, uploadedAt: true, reviewStatus: true, documentType: true },
      orderBy: { uploadedAt: "desc" },
    }),
  ]);
  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn/>
      <EducationHistoryForm
        education={normalizeEducationHistory(studentCase?.educationHistory)}
        educationDocuments={educationDocuments}
        legacyDocuments={legacyDocuments.map((doc) => ({
          id: doc.id,
          originalFileName: doc.originalFileName,
          uploadedAt: doc.uploadedAt.toISOString(),
          reviewStatus: doc.reviewStatus,
          legacyType: doc.documentType as "ACADEMIC_TRANSCRIPT" | "DEGREE_CERTIFICATE",
        }))}
      />
    </div>
  );
}
