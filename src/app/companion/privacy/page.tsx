import Link from "next/link";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "SOUP Companion — Privacy notice" };

export default async function CompanionPrivacyPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn={!!user} />
      <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
        <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">SOUP Companion</div>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Privacy notice</h1>
        <p className="mt-2 text-xs text-mute">Last updated {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

        <section className="mt-6 space-y-3">
          <h2 className="text-sm font-semibold text-ink">What SOUP Companion is</h2>
          <p className="text-sm leading-6 text-mute">SOUP Companion is a browser extension that opens a side panel beside external university, visa and accommodation application websites. It reads the form fields on the page you're currently viewing and offers to fill fields it recognises using information already saved in your SOUP account, so you review and confirm every field before it's used.</p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-sm font-semibold text-ink">What it can access, and why</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-mute">
            <li><strong className="text-ink">Pages you open it on.</strong> The extension's content script can read the visible form fields (labels, input types, current values) of the active tab so it can detect what the page is asking for. It does not read page content when the side panel is closed or on a page you haven't opened it on, and it never transmits page content anywhere other than to fill fields locally in your own browser.</li>
            <li><strong className="text-ink">Your SOUP profile data.</strong> Name, date of birth, nationality, country of residence, and the study preferences you've told Noodles — only the fields that genuinely exist in your SOUP account. Nothing is invented; a field SOUP doesn't have an answer for is always shown to you as "needs your input," never guessed.</li>
            <li><strong className="text-ink">Document metadata.</strong> A list of documents in your SOUP vault (type, filename, review status) so Companion can tell you what's ready. Raw document files are only opened when you explicitly click to view one, via a short-lived secure link.</li>
            <li><strong className="text-ink">What it fills.</strong> A record of which fields were filled, on which site, is kept as an audit trail visible to you and authorised SOUP staff — the same way other SOUP account activity is recorded.</li>
          </ul>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-sm font-semibold text-ink">What it never does</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-mute">
            <li>Never submits an application, form, or payment on your behalf.</li>
            <li>Never fills a field without you triggering the action from the side panel.</li>
            <li>Never sends your SOUP session credentials to the extension — connecting uses a short-lived, single-use pairing code instead, exchanged once for a device-specific access token.</li>
            <li>Never sells or shares your data with the university, visa authority, or accommodation provider whose site you're on, beyond what you choose to submit yourself.</li>
          </ul>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-sm font-semibold text-ink">Your control</h2>
          <p className="text-sm leading-6 text-mute">You can revoke a connected device's access at any time from <Link href="/companion/connect" className="font-semibold text-navy">My SOUP → SOUP Companion</Link>. A revoked device immediately loses the ability to read your SOUP data or fill anything, even if it's still installed in a browser.</p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-sm font-semibold text-ink">Questions</h2>
          <p className="text-sm leading-6 text-mute">Contact SOUP support from <Link href="/support" className="font-semibold text-navy">soupassist.com/support</Link> for any question about this notice or your data.</p>
        </section>
      </main>
    </div>
  );
}
