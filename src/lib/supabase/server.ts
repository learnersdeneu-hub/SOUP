import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side Supabase client for use in Server Components, Server Actions,
// and Route Handlers. Reads/writes the auth session via cookies.
//
// flowType defaults to Supabase's own default (PKCE), which requires the
// browser that opens an emailed link to be the exact same browser/cookie
// jar that started the request — confirmed in production to break when a
// student opens the link from a mail app that uses a different browser
// context ("code challenge does not match previously saved code
// verifier"). Callers that build a link meant to be opened from an email
// client on a possibly-different browser context (the email OTP magic
// link) should pass flowType: "implicit" instead, which puts the session
// tokens directly in the redirect URL's fragment rather than requiring a
// matching stored code_verifier. See src/app/auth/magic-link/page.tsx for
// the corresponding client-side handler.
export function createClient(options?: { flowType?: "pkce" | "implicit" }) {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: options?.flowType ? { flowType: options.flowType } : undefined,
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component with no request context — safe to
            // ignore because the middleware refreshes the session on navigation.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Same as above.
          }
        },
      },
    }
  );
}
