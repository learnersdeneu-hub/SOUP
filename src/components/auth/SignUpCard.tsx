"use client";

import { useState } from "react";
import Link from "next/link";
import { startEmailOtp } from "@/app/actions/auth";
import { OtpVerifyStep } from "@/components/auth/OtpVerifyStep";

const inputClass = "w-full rounded-xl border border-hair px-4 py-2.5 text-sm outline-none";

// Full Name -> Email -> Institution Name -> Continue -> verification code ->
// Verify -> account created. Email OTP only (no password field at all for
// new accounts) — Supabase's signInWithOtp both creates the account and
// sends the code in one call; ensureUserAndProfile does the actual
// User/Profile creation once the code is verified, so nothing here talks to
// Prisma directly.
export function SignUpCard({ next, subtitle }: { next: string; subtitle: string }) {
  const [step, setStep] = useState<"details" | "otp">("details");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setStep("otp");
  }

  if (step === "otp") {
    return <OtpVerifyStep email={email} fullName={fullName} institutionName={institutionName} next={next} onChangeEmail={() => setStep("details")} />;
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
        <button type="submit" disabled={sending} className="w-full rounded-xl py-2.5 text-sm font-medium text-white bg-navy disabled:opacity-60">{sending ? "Sending code…" : "Continue"}</button>
      </form>
      <p className="text-xs text-mute text-center mt-4">Already have an account? <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className="text-navy font-medium">Sign in</Link></p>
    </div>
  );
}
