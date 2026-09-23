"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureUserAndProfile } from "@/lib/auth/provision";
import { logServerError as logAuthError } from "@/lib/logging/safe";

// CRITICAL, security-relevant: Next.js's client-side Router Cache stores
// previously-rendered pages per URL for up to ~30s on dynamic routes (this
// app's default), with no awareness of which user rendered them. A
// redirect() inside a Server Action is a soft, client-side navigation, not
// a hard reload — without this, a student who just signed out (or a
// completely different student who just signed in, in the same browser
// tab, which is expressly how this app is used on shared/school devices)
// could land on a cached /dashboard or /documents payload that was
// actually rendered for the PREVIOUS account, showing that account's real
// data under the new session. This is the confirmed root cause of a real
// cross-account document leak report. Call this before every redirect that
// follows an auth state change (sign in, sign up, sign out, OTP verify,
// password change) — never on an error path, since auth state didn't
// change there.
function invalidateAuthenticatedPages() {
  revalidatePath("/", "layout");
}

function baseUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : "http://localhost:3001";
}

function safeNext(formData: FormData, fallback = "/dashboard") {
  const next = String(formData.get("next") || "").trim();
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("fullName") || "").trim();
  const next = safeNext(formData);

  if (!email || !password || !fullName) {
    redirect("/sign-up?error=" + encodeURIComponent("All fields are required."));
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${baseUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.user) {
    redirect("/sign-up?error=" + encodeURIComponent("We could not create that account. Check the details or try signing in if you already have an account."));
  }

  // Some Supabase projects issue a session immediately; others require email
  // confirmation. Provision only when we have a confirmed session. The auth
  // callback provisions the same User/Profile idempotently after confirmation.
  if (data.session) {
    try {
      await ensureUserAndProfile(data.user, fullName);
    } catch {
      redirect(
        "/sign-up?error=" +
          encodeURIComponent("Your account was created, but profile setup failed. Please try signing in again.")
      );
    }
    invalidateAuthenticatedPages();
    redirect(next);
  }

  redirect(`/check-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = safeNext(formData);

  if (!email || !password) {
    redirect("/sign-in?error=" + encodeURIComponent("Email and password are required."));
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    redirect("/sign-in?error=" + encodeURIComponent("The email or password is incorrect, or the account still needs email confirmation."));
  }

  try {
    await ensureUserAndProfile(data.user);
  } catch {
    redirect(
      "/sign-in?error=" +
        encodeURIComponent("You signed in successfully, but your SOUP profile could not be prepared. Please try again.")
    );
  }

  invalidateAuthenticatedPages();
  redirect(next);
}

// Email + sign-in link is the only authentication method for both signup
// and sign-in — the same call either way, unified by Supabase's own
// shouldCreateUser semantics: a brand-new email creates the account, a
// known email just signs it in. Called directly from client code (the
// multi-step sign-up/sign-in UI manages its own step transitions).
//
// SOUP is link-only by explicit product decision: no numeric code is ever
// shown or typed anywhere in this flow. Supabase's "Confirm signup" /
// "Magic Link" email templates must send a confirmation LINK using
// {{ .ConfirmationURL }} (Supabase's default) — not {{ .Token }} — for this
// to work as intended; that template choice lives in the Supabase
// Dashboard and is outside this app's code.
//
// emailRedirectTo points the link at /auth/magic-link, a CLIENT-rendered
// page, not the PKCE-based /auth/callback route handler. This is a
// deliberate, confirmed-in-production fix: PKCE (the default flow)
// requires the browser that opens the emailed link to be the exact same
// browser/cookie jar that requested it, because it must present a stored
// code_verifier that matches the code_challenge baked into the link.
// Real production logs showed this failing with "code challenge does not
// match previously saved code verifier" whenever the student's mail app
// opened the link in a different browser context than the one used to
// submit the sign-up form — an extremely common case on mobile (mail apps
// frequently use their own in-app browser/WebView), and the opposite of
// how a normal "click the link in your inbox" flow is expected to work.
// Using flowType: "implicit" instead puts the session tokens directly in
// the redirect URL's fragment, so any browser that opens the link can
// complete sign-in — no stored verifier required. See
// src/app/auth/magic-link/page.tsx for the client-side handler and
// completeEmailLinkSignIn below for the provisioning step it calls.
//
// This returns a plain { ok, error } result on failure rather than
// throwing. Confirmed in production (real log, not a guess): when
// Supabase's own email send fails ("Error sending confirmation email" —
// Supabase's default email sender, unrelated to this app's own
// sendTransactionalEmail/Resend setup, is what actually sends this), the
// resulting thrown error was NOT reliably caught by the calling client
// component's try/catch and instead surfaced as a full framework error
// page. Returning a result object sidesteps that failure mode entirely.
// Do not change this back to throwing without confirming the underlying
// Next.js behavior first.
export async function startEmailOtp(params: { email: string; fullName?: string; institutionName?: string; next?: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = params.email.trim().toLowerCase();
  if (!email || !email.includes("@")) return { ok: false, error: "Enter a valid email address." };
  const fullName = params.fullName?.trim().slice(0, 120) || undefined;
  const institutionName = params.institutionName?.trim().slice(0, 200) || undefined;
  const next = params.next && params.next.startsWith("/") && !params.next.startsWith("//") ? params.next : "/dashboard";

  try {
    const supabase = createClient({ flowType: "implicit" });
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${baseUrl()}/auth/magic-link?next=${encodeURIComponent(next)}`,
        ...(fullName || institutionName ? { data: { ...(fullName ? { full_name: fullName } : {}), ...(institutionName ? { institution_name: institutionName } : {}) } } : {}),
      },
    });
    if (error) {
      logAuthError("SOUP_START_EMAIL_OTP_FAILED", error);
      return { ok: false, error: /confirmation email|sending/i.test(error.message || "") ? "SOUP could not send the verification email right now. Please try again shortly." : (error.message || "Could not send a verification code. Please try again.") };
    }
    return { ok: true };
  } catch (caught) {
    logAuthError("SOUP_START_EMAIL_OTP_UNEXPECTED", caught);
    return { ok: false, error: "Could not send a verification code. Please try again." };
  }
}

// Called by src/app/auth/magic-link/page.tsx after it has already called
// supabase.auth.setSession() client-side with the tokens from the email
// link's URL fragment — that call is what actually establishes the
// session cookie; by the time this server action runs, createClient() can
// read that cookie like any other authenticated request. This only
// provisions the User/Profile row and redirects, mirroring what
// /auth/callback does for the PKCE-based flows (OAuth, password
// signup/reset).
export async function completeEmailLinkSignIn(params: { next?: string }): Promise<{ ok: false; error: string } | void> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { ok: false, error: "That sign-in link is invalid or expired. Please try again." };
  }

  try {
    await ensureUserAndProfile(data.user);
  } catch (caught) {
    logAuthError("SOUP_COMPLETE_EMAIL_LINK_SIGNIN_FAILED", caught);
    return { ok: false, error: "You're signed in, but your SOUP profile could not be prepared. Please try again." };
  }

  const next = params.next && params.next.startsWith("/") && !params.next.startsWith("//") ? params.next : "/dashboard";
  invalidateAuthenticatedPages();
  redirect(next);
}

// Fallback for /auth/magic-link when the emailed link arrives as a PKCE
// ?code= (query string) instead of the implicit flow's #access_token=...
// (hash fragment) that startEmailOtp's flowType: "implicit" override is
// meant to produce. Confirmed in production that the hash sometimes
// arrives completely empty — this handles that case using the same
// exchangeCodeForSession approach /auth/callback uses for OAuth and
// password flows, so the student can still sign in even if Supabase ends
// up using PKCE for this link. If PKCE genuinely is unavoidable here, this
// will still fail with the same code-verifier mismatch when opened in a
// different browser than the one that requested it — but it will succeed
// for same-browser clicks and never leaves the page silently broken.
export async function completeEmailLinkCode(params: { code: string; next?: string }): Promise<{ ok: false; error: string } | void> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
  if (error || !data.user) {
    const mismatch = /code verifier|code challenge/i.test(error?.message || "");
    return {
      ok: false,
      error: mismatch
        ? "This link only works in the same app/browser you used to sign up. Please try again from that same browser, or request a new link."
        : "That sign-in link is invalid or expired. Please try again.",
    };
  }

  try {
    await ensureUserAndProfile(data.user);
  } catch (caught) {
    logAuthError("SOUP_COMPLETE_EMAIL_LINK_CODE_FAILED", caught);
    return { ok: false, error: "You're signed in, but your SOUP profile could not be prepared. Please try again." };
  }

  const next = params.next && params.next.startsWith("/") && !params.next.startsWith("//") ? params.next : "/dashboard";
  invalidateAuthenticatedPages();
  redirect(next);
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNext(formData);
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${baseUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect(`/sign-in?error=${encodeURIComponent("Google sign-in could not be started. Please try again or use email and password.")}`);
  redirect(data.url);
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) redirect("/forgot-password?error=" + encodeURIComponent("Email is required."));

  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl()}/auth/callback?next=/reset-password`,
  });

  // Keep the response deliberately generic so the reset form cannot be used to
  // discover whether a particular email address is registered.
  if (error && process.env.NODE_ENV !== "production") {
    console.error("SOUP_PASSWORD_RESET_REQUEST_FAILED", error.name);
  }
  redirect("/forgot-password?sent=1");
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (password.length < 8) {
    redirect("/reset-password?error=" + encodeURIComponent("Password must be at least 8 characters."));
  }
  if (password !== confirmPassword) {
    redirect("/reset-password?error=" + encodeURIComponent("Passwords do not match."));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/reset-password?error=" + encodeURIComponent("Your password could not be updated. The reset link may have expired; request a new one and try again."));

  // End the temporary recovery session after a successful password change.
  // Re-authentication proves the new password works and avoids leaving a reset
  // session active in a shared browser.
  await supabase.auth.signOut().catch(() => undefined);
  invalidateAuthenticatedPages();
  redirect("/sign-in?reset=1");
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  invalidateAuthenticatedPages();
  redirect("/");
}
