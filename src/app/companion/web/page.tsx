import Link from "next/link";
import { requireProfile } from "@/lib/auth/currentUser";
import { getPremiumStatus } from "@/lib/payments/status";
import { buildAnswerBank } from "@/lib/companion/answerBank";
import { CompanionWebPanel } from "@/components/companion/CompanionWebPanel";

// Same defense-in-depth as src/app/companion/connect/page.tsx — see that
// file's comment for the full explanation (shared/school-device router
// cache risk).
export const dynamic = "force-dynamic";

// The no-install path: a small reference panel meant to be opened with
// window.open() alongside the real application site (see
// src/components/companion/OpenWebCompanionButton.tsx for the launcher).
// It never reads or writes anything on the other site's page — same-origin
// policy makes that impossible from a plain popup regardless — it only ever
// shows the student's own SOUP answers so they can copy or drag them across.
// Gated to Pro (SOUP Scholar / SOUP Concierge) because the desktop app
// already does this and more for free; the web version is the always-on
// companion for whichever device the student happens to be on.
export default async function CompanionWebPage() {
  const { user, profile } = await requireProfile();
  const { plusActive } = await getPremiumStatus(profile.id);

  if (!plusActive) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-5">
        <div className="w-full max-w-sm rounded-2xl border border-hair bg-white p-6 text-center">
          <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">Companion · Web</div>
          <h1 className="mt-2 text-lg font-semibold text-ink">This is a Pro feature</h1>
          <p className="mt-2 text-xs leading-5 text-mute">The browser-based Companion is included with SOUP Scholar and SOUP Concierge. Upgrade to use your SOUP answers on any device without installing anything.</p>
          <Link href="/premium" className="mt-4 inline-flex items-center justify-center rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white">See SOUP Scholar</Link>
        </div>
      </div>
    );
  }

  const data = await buildAnswerBank(profile.id, {
    fullName: user.fullName,
    email: user.email,
    dateOfBirth: user.dateOfBirth,
    nationality: user.nationality,
    currentCountry: user.currentCountry,
  });

  return <CompanionWebPanel studentName={user.fullName || "Your SOUP account"} {...data} />;
}
