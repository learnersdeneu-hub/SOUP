import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureUserAndProfile, AccessNotApprovedError } from "@/lib/auth/provision";
import { determinePostLoginLanding } from "@/lib/auth/postLoginLanding";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "";
  const explicit = next.startsWith("/") && !next.startsWith("//") ? next : null;

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent("The confirmation link is invalid or expired.")}`);
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent("That sign-in or confirmation link is invalid or expired. Please try again.")}`);
  }

  let profileId: string;
  try {
    const provisioned = await ensureUserAndProfile(data.user);
    profileId = provisioned.profile.id;
  } catch (caught) {
    if (caught instanceof AccessNotApprovedError) {
      await supabase.auth.signOut().catch(() => undefined);
      return NextResponse.redirect(
        `${origin}/sign-in?error=${encodeURIComponent("This email hasn't been approved for SOUP access yet. Request access first, or wait for your approval email if you already requested it.")}`
      );
    }
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent("Your email was confirmed, but your SOUP profile could not be prepared. Please sign in again.")}`
    );
  }

  // Defense-in-depth alongside the same fix in actions/auth.ts: this
  // redirect is a real HTTP Location header (the browser does a full
  // navigation, unlike a Server Action's soft client-side redirect), so it
  // is not the primary vector for the router-cache leak — but busting the
  // cache here too costs nothing and removes any doubt for this landing
  // point as well (OAuth, email confirmation, password reset).
  revalidatePath("/", "layout");
  const landing = explicit ?? (await determinePostLoginLanding(profileId));
  return NextResponse.redirect(`${origin}${landing}`);
}
