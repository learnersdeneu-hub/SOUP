"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn, startEmailOtp } from "@/app/actions/auth";
import { CheckEmailStep } from "@/components/auth/CheckEmailStep";

const inputClass = "w-full rounded-xl border border-hair px-4 py-2.5 text-sm outline-none";

// Email + sign-in link is the primary sign-in path; password stays
// available as a secondary option so existing password accounts are never
// locked out (same signIn server action as before, untouched). Institution
// name is intentionally never asked or checked here — it's registration-time
// data only, not a sign-in credential.
export function SignInCard({ next, errorMessage, resetNotice }: { next: string; errorMessage?: string; resetNotice?: boolean }) {
  const [step, setStep] = useState<"email" | "sent">("email");
  // An errorMessage prop only ever arrives via a server redirect back to
  // this page with ?error= — the only action that still does that is the
  // password-based signIn (the OTP actions handle their own errors
  // client-side without a page reload). So an incoming error means a
  // password attempt just failed: open the password form so the student
  // sees their error next to the form that produced it, not the OTP view.
  const [showPassword, setShowPassword] = useState(Boolean(errorMessage));
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(errorMessage || null);

  async function continueWithEmail(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) { setError("Enter your email address."); return; }
    setSending(true);
    setError(null);
    const result = await startEmailOtp({ email, next });
    setSending(false);
    if (!result.ok) { setError(result.error); return; }
    setStep("sent");
  }

  if (step === "sent") {
    return <CheckEmailStep email={email} next={next} onChangeEmail={() => setStep("email")} />;
  }

  return (
    <div>
      <h1 className="text-xl font-medium text-ink mb-6 text-center">Sign in to SOUP</h1>
      {error && <div className="mb-4 rounded-lg border border-hair bg-[#FBEAEA] text-[#B3261E] text-xs px-3 py-2">{error}</div>}
      {resetNotice && <div className="mb-4 rounded-lg border border-hair bg-[#EAF5F3] px-3 py-2 text-xs leading-5 text-teal">Password updated. Sign in with your new password.</div>}

      {!showPassword ? (
        <>
          <form onSubmit={continueWithEmail} className="space-y-3">
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required placeholder="Email" className={inputClass} />
            <button type="submit" disabled={sending} className="w-full rounded-xl py-2.5 text-sm font-medium text-white bg-navy disabled:opacity-60">{sending ? "Sending link…" : "Continue with Email"}</button>
          </form>
          <div className="mt-3 text-center">
            <button type="button" onClick={() => { setShowPassword(true); setError(null); }} className="text-xs font-medium text-navy">Sign in with password instead</button>
          </div>
        </>
      ) : (
        <>
          <form action={signIn} className="space-y-3">
            <input type="hidden" name="next" value={next} />
            <input name="email" defaultValue={email} type="email" autoComplete="email" required placeholder="Email" className={inputClass} />
            <input name="password" type="password" autoComplete="current-password" required placeholder="Password" className={inputClass} />
            <button type="submit" className="w-full rounded-xl py-2.5 text-sm font-medium text-white bg-navy">Sign In</button>
          </form>
          <div className="mt-3 text-center">
            <button type="button" onClick={() => { setShowPassword(false); setError(null); }} className="text-xs font-medium text-navy">Use an email code instead</button>
          </div>
        </>
      )}
      <div className="mt-2 text-center"><Link href="/forgot-password" className="text-xs font-medium text-mute">Forgot password?</Link></div>

      <p className="text-xs text-mute text-center mt-4">Don&apos;t have an account? <Link href={`/sign-up?next=${encodeURIComponent(next)}`} className="text-navy font-medium">Sign up for free</Link></p>
    </div>
  );
}
