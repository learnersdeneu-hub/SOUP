import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Pages reachable without a signed-in session. Auth API routes are handled
// separately below (all of /api is left to each route's own auth check —
// this preview-access gate must never block server-to-server calls like the
// Stripe webhook or the uptime health check with an HTML redirect).
// /companion/privacy must be readable without a session: Chrome Web Store
// reviewers and prospective testers need to open it before they have (or
// without ever creating) a SOUP account.
const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/check-email", "/auth/callback", "/companion/privacy"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!user && !pathname.startsWith("/api/") && !isPublicPath(pathname)) {
    const redirectUrl = new URL("/sign-in", request.url);
    redirectUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
