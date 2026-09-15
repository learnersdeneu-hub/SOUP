import { Header } from "@/components/Header";
import { requireProfile } from "@/lib/auth/currentUser";
import { CompanionConnect } from "@/components/companion/CompanionConnect";

export default async function CompanionConnectPage() {
  await requireProfile();
  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn />
      <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
        <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">SOUP Companion</div>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Connect the browser extension</h1>
        <p className="mt-2 text-sm leading-6 text-mute">SOUP Companion helps you fill out university, visa and accommodation application forms directly on the official site, using information already saved in your SOUP account. Generate a one-time code below, then enter it into the Companion side panel.</p>
        <div className="mt-6"><CompanionConnect /></div>
        <div className="mt-8 rounded-2xl border border-hair bg-white p-5">
          <div className="text-xs font-semibold text-ink">What Companion can see</div>
          <p className="mt-2 text-xs leading-5 text-mute">Your name, date of birth, nationality, country of residence and the study preferences you've told Noodles, plus a list of your uploaded documents (never the raw files, only metadata — you approve opening any document from the panel). Companion never submits an application on your behalf and never fills a field without your review.</p>
        </div>
      </main>
    </div>
  );
}
