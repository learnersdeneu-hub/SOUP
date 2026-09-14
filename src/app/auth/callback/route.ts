import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserAndProfile } from "@/lib/auth/provision";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent("The confirmation link is invalid or expired.")}`);
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent("That sign-in or confirmation link is invalid or expired. Please try again.")}`);
  }

  try {
    await ensureUserAndProfile(data.user);
  } catch {
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent("Your email was confirmed, but your SOUP profile could not be prepared. Please sign in again.")}`
    );
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
