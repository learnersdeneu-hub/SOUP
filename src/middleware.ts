import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Pages reachable without a signed-in session. Auth API routes are handled
// separately below (all of /api is left to each route's own auth check —
// this preview-access gate must never block server-to-server calls like the
// Stripe webhook or the uptime health check with an HTML redirect).
// /companion/privacy must be readable without a session: Chrome Web Store
// reviewers and prospective testers need to open it before they have (or
// without ever creating) a SOUP account.
// /recommend/[token] is the recommender's own letter-submission link — the
// recommender has no SOUP account at all; that page authenticates the
// visitor against the token in the URL itself, not a session (see
// src/app/recommend/[token]/page.tsx).
// /journal is the SOUP Journal linked from the signed-out landing page —
// public articles meant to be read before anyone has an account.
// /guides, /about, /robots.txt and /sitemap.xml are the public, indexable
// editorial surface: search engines and signed-out readers must reach them
// without a session. Draft guides never render there (they 404); staff
// preview them under /admin/guides instead.
const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/check-email", "/auth/callback", "/auth/magic-link", "/companion/privacy", "/recommend", "/journal", "/guides", "/about", "/robots.txt", "/sitemap.xml"];

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
  // /downloads/* is excluded entirely (not just added to PUBLIC_PATHS):
  // static installer files there must be fetchable by signed-out visitors
  // and don't need the Supabase session-refresh work middleware otherwise
  // does on every request. .exe wasn't previously in the static-extension
  // exclusion list either — public/downloads/*.exe was being silently
  // redirected to /sign-in (a 200 HTML response, not the file) until this
  // was added. .mp4/.webm likewise: the landing page's tour video
  // (public/landing/soup-tour.mp4) must load for signed-out visitors.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|downloads/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|exe|mp4|webm)$).*)",
  ],
};
