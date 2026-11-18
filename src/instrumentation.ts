import * as Sentry from "@sentry/nextjs";

// Next.js calls register() once per server runtime at startup. Each config
// is a no-op unless SENTRY_DSN is set (see sentry.server.config.ts /
// sentry.edge.config.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("../sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("../sentry.edge.config");
}

// Reports errors thrown in Server Components, route handlers and server
// actions — these never reach the browser, so the client config can't see them.
export const onRequestError = Sentry.captureRequestError;
