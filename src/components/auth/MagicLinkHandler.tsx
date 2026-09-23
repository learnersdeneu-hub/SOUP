"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { completeEmailLinkSignIn } from "@/app/actions/auth";

// Supabase's implicit-flow email link redirects here with the session
// tokens in the URL fragment (#access_token=...&refresh_token=...), which
// browsers never send to a server — only client-side JS can read it. This
// establishes the session locally via setSession(), then hands off to a
// server action to provision the profile and redirect. See the comment on
// startEmailOtp in actions/auth.ts for why this exists instead of the
// PKCE-based /auth/callback route: PKCE requires the link to be opened in
// the exact browser that requested it, which real mail apps routinely
// violate.
export function MagicLinkHandler({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const rawHash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
      const params = new URLSearchParams(rawHash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const hashError = params.get("error_description") || params.get("error");

      // Surfacing the specific reason (never the tokens themselves) instead
      // of one generic message: this flow has failed multiple times in
      // production for different underlying reasons, and a single vague
      // message made every failure look identical and undebuggable from a
      // screenshot alone.
      if (hashError) {
        if (!cancelled) setError(`Sign-in link error: ${hashError.replace(/\+/g, " ")}`);
        return;
      }
      if (!accessToken || !refreshToken) {
        if (!cancelled) setError(`This link didn't include sign-in information (received: "${rawHash || "nothing"}"). Please request a new one.`);
        return;
      }

      const supabase = createClient();
      const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (sessionError) {
        if (!cancelled) setError(`Could not establish your session: ${sessionError.message}`);
        return;
      }

      // Clear the "pending send" markers SignUpCard/SignInCard use to
      // survive a stray reload — sign-in just actually completed, so a
      // later visit to /sign-up or /sign-in should show a fresh form, not
      // a stale "check your email" screen for this already-finished link.
      try {
        sessionStorage.removeItem("soup_signup_pending");
        sessionStorage.removeItem("soup_signin_pending");
      } catch {
        // Private browsing / blocked storage — safe to ignore.
      }

      const result = await completeEmailLinkSignIn({ next });
      if (!cancelled && result && !result.ok) setError(result.error);
    }

    run();
    return () => { cancelled = true; };
  }, [next]);

  if (error) {
    return (
      <div className="text-center">
        <div className="mb-4 rounded-lg border border-hair bg-[#FBEAEA] text-[#B3261E] text-xs px-3 py-2">{error}</div>
        <Link href="/sign-in" className="text-xs font-medium text-navy">Back to sign in</Link>
      </div>
    );
  }

  return <p className="text-center text-sm text-mute">Signing you in…</p>;
}
