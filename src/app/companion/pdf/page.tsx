import { StudyHeader } from "@/components/layout/StudyHeader";
import { requireProfile } from "@/lib/auth/currentUser";
import { PdfFormFiller } from "@/components/companion/PdfFormFiller";

// Same defense-in-depth as src/app/companion/connect/page.tsx — see that
// file's comment for the full explanation (shared/school-device router
// cache risk).
export const dynamic = "force-dynamic";

// Fills any genuinely fillable PDF application form (visa forms, a
// university's own downloadable PDF, UCAS-style exports) from the
// student's SOUP profile, and appends their chosen supporting documents
// as extra pages — the PDF counterpart to the HTML-form filling the
// desktop app already does. Free for every signed-in student, same as the
// desktop app itself (only the no-install web reference panel is Pro).
export default async function CompanionPdfPage() {
  const { user } = await requireProfile();

  return (
    <div className="min-h-screen bg-paper">
      <StudyHeader current="companion" signedIn fullName={user.fullName} />
      <main className="mx-auto max-w-[760px] px-5 py-10 sm:px-8">
        <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">SOUP Companion · PDF forms</div>
        <h1 className="mt-2 text-[26px] font-extrabold leading-tight text-ink">Fill any PDF application form</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-mute">Upload a blank fillable PDF — a visa form, a university's own application PDF, anything with real form fields — and SOUP fills what it can from your profile, lets you fix the rest, and attaches your supporting documents before you download it.</p>

        <div className="mt-7">
          <PdfFormFiller />
        </div>
      </main>
    </div>
  );
}
