"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { startEmailOtp } from "@/app/actions/auth";
import { CheckEmailStep } from "@/components/auth/CheckEmailStep";

const inputClass = "w-full rounded-xl border border-hair px-4 py-2.5 text-sm outline-none";
const PENDING_STORAGE_KEY = "soup_signup_pending";

// Full Name -> Email -> Institution Name -> Continue -> "check your email".
// Link-only, no password and no typed code for new accounts — Supabase's
// signInWithOtp both creates the account and sends the sign-in link in one
// call. Sign-in actually completes when the student clicks that link and
// lands on /auth/magic-link, which calls ensureUserAndProfile; nothing
// here talks to Prisma directly.
export function SignUpCard({ next, subtitle }: { next: string; subtitle: string }) {
  const [step, setStep] = useState<"details" | "sent">("details");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Confirmed in production: a browser tab left open across a deploy can
  // silently full-reload back to this blank form right after the email
  // send has already succeeded server-side, because the tab's stale
  // Server Action reference no longer matches the new deployment. That
  // reload wipes local React state, so the student never sees "check your
  // email" even though the email really was sent. Persisting the pending
  // send to sessionStorage means a stray reload restores the "sent" screen
  // instead of silently dropping back to an empty form.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PENDING_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { email?: string; fullName?: string; institutionName?: string };
      if (!saved.email) return;
      setEmail(saved.email);
      setFullName(saved.fullName || "");
      setInstitutionName(saved.institutionName || "");
      setStep("sent");
    } catch {
      // Private browsing / blocked storage — safe to ignore, just falls
      // back to the normal details step.
    }
  }, []);

  async function submitDetails(event: React.FormEvent) {
    event.preventDefault();
    if (!fullName.trim() || !email.trim() || !institutionName.trim()) {
      setError("Full name, email and institution name are all required.");
      return;
    }
    setSending(true);
    setError(null);
    // startEmailOtp returns { ok, error } rather than throwing — confirmed
    // in production that a thrown error here was not reliably caught by
    // this try/catch and instead crashed the page. See the comment on
    // startEmailOtp in actions/auth.ts for the full explanation.
    const result = await startEmailOtp({ email, fullName, institutionName, next });
    setSending(false);
    if (!result.ok) { setError(result.error); return; }
    try { sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify({ email, fullName, institutionName })); } catch {}
    setStep("sent");
  }

  function changeEmail() {
    try { sessionStorage.removeItem(PENDING_STORAGE_KEY); } catch {}
    setStep("details");
  }

  if (step === "sent") {
    return <CheckEmailStep email={email} fullName={fullName} institutionName={institutionName} next={next} onChangeEmail={changeEmail} />;
  }

  return (
    <div>
      <h1 className="text-xl font-medium text-ink mb-2 text-center">Create your free SOUP account</h1>
      <p className="mb-6 text-center text-xs leading-5 text-mute">{subtitle}</p>
      {error && <div className="mb-4 rounded-lg border border-hair bg-[#FBEAEA] text-[#B3261E] text-xs px-3 py-2">{error}</div>}
      <form onSubmit={submitDetails} className="space-y-3">
        <input value={fullName} onChange={(event) => setFullName(event.target.value)} type="text" autoComplete="name" required placeholder="Full name" className={inputClass} />
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required placeholder="Email" className={inputClass} />
        <input value={institutionName} onChange={(event) => setInstitutionName(event.target.value)} type="text" autoComplete="organization" required placeholder="Institution name (school, college, university...)" className={inputClass} />
        <button type="submit" disabled={sending} className="w-full rounded-xl py-2.5 text-sm font-medium text-white bg-navy disabled:opacity-60">{sending ? "Sending link…" : "Continue"}</button>
      </form>
      <p className="text-xs text-mute text-center mt-4">Already have an account? <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className="text-navy font-medium">Sign in</Link></p>
    </div>
  );
}
