"use client";

import { useEffect, useState } from "react";
import { startEmailOtp } from "@/app/actions/auth";

const RESEND_COOLDOWN_SECONDS = 60;

// Shared by both the sign-up and sign-in cards. SOUP is link-only: a student
// never types a code here. Supabase emails a sign-in link that lands on
// /auth/callback, which exchanges it for a session, provisions the profile,
// and redirects straight into the dashboard — see actions/auth.ts. This
// screen is only a waiting state; it never itself completes sign-in, so
// there is nothing to submit here beyond an optional resend.
export function CheckEmailStep({
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
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function resend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    setResendNotice(null);
    const result = await startEmailOtp({ email, fullName, institutionName, next });
    setResending(false);
    if (!result.ok) { setError(result.error); return; }
    setResendNotice("Link sent again.");
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  return (
    <div>
      <h1 className="text-xl font-medium text-ink mb-2 text-center">Check your email</h1>
      <p className="mb-6 text-center text-xs leading-5 text-mute">
        We sent a sign-in link to <span className="font-semibold text-ink">{email}</span>. Open your inbox and tap
        the link to land straight in your SOUP dashboard.
      </p>

      {error && <div className="mb-4 rounded-lg border border-hair bg-[#FBEAEA] text-[#B3261E] text-xs px-3 py-2">{error}</div>}
      {resendNotice && !error && <div className="mb-4 rounded-lg border border-hair bg-[#EAF5F3] px-3 py-2 text-xs leading-5 text-teal">{resendNotice}</div>}

      <div className="flex items-center justify-between text-xs">
        <button type="button" onClick={resend} disabled={cooldown > 0 || resending} className="font-medium text-navy disabled:text-mute disabled:cursor-not-allowed">
          {resending ? "Sending…" : cooldown > 0 ? `Resend link (${cooldown}s)` : "Resend link"}
        </button>
        <button type="button" onClick={onChangeEmail} className="font-medium text-mute">Change email</button>
      </div>
    </div>
  );
}
