"use client";

import { useEffect, useRef, useState } from "react";
import { startEmailOtp, verifyEmailOtp } from "@/app/actions/auth";

const RESEND_COOLDOWN_SECONDS = 60;

// Shared by both the sign-up and sign-in cards: whichever surface got the
// student here, entering and verifying the code works the same way and
// calls the same verifyEmailOtp action. fullName/institutionName are only
// ever meaningful the first time an account is created (see
// ensureUserAndProfile) — passed through harmlessly as undefined from the
// sign-in card, which never collects them.
export function OtpVerifyStep({
  email,
  fullName,
  institutionName,
  next,
  onChangeEmail,
}: {
  email: string;
  fullName?: string;
  institutionName?: string;
  next: string;
  onChangeEmail: () => void;
}) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setVerifying(true);
    setError(null);
    // verifyEmailOtp returns { ok: false, error } on failure and redirects
    // (never returns) on success — see the comment on it in actions/auth.ts
    // for why this is a return value rather than a thrown exception.
    const result = await verifyEmailOtp({ email, token: code.trim(), next, fullName, institutionName });
    if (result && !result.ok) {
      setError(result.error);
      setVerifying(false);
    }
  }

  async function resend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    setResendNotice(null);
    const result = await startEmailOtp({ email, fullName, institutionName, next });
    setResending(false);
    if (!result.ok) { setError(result.error); return; }
    setResendNotice("A new code has been sent.");
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setCode("");
    inputRef.current?.focus();
  }

  return (
    <div>
      <h1 className="text-xl font-medium text-ink mb-2 text-center">Enter verification code</h1>
      <p className="mb-6 text-center text-xs leading-5 text-mute">We sent a 6-digit code to <span className="font-semibold text-ink">{email}</span>. Enter it below to continue.</p>

      {error && <div className="mb-4 rounded-lg border border-hair bg-[#FBEAEA] text-[#B3261E] text-xs px-3 py-2">{error}</div>}
      {resendNotice && !error && <div className="mb-4 rounded-lg border border-hair bg-[#EAF5F3] px-3 py-2 text-xs leading-5 text-teal">{resendNotice}</div>}

      <form onSubmit={verify} className="space-y-3">
        <input
          ref={inputRef}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          placeholder="6-digit code"
          className="w-full rounded-xl border border-hair px-4 py-2.5 text-center text-lg tracking-[.3em] outline-none"
        />
        <button type="submit" disabled={verifying || code.trim().length < 6} className="w-full rounded-xl py-2.5 text-sm font-medium text-white bg-navy disabled:opacity-60">{verifying ? "Verifying…" : "Verify"}</button>
      </form>

      <div className="mt-4 flex items-center justify-between text-xs">
        <button type="button" onClick={resend} disabled={cooldown > 0 || resending} className="font-medium text-navy disabled:text-mute disabled:cursor-not-allowed">
          {resending ? "Sending…" : cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
        </button>
        <button type="button" onClick={onChangeEmail} className="font-medium text-mute">Change email</button>
      </div>
    </div>
  );
}
