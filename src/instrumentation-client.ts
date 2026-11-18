import * as Sentry from "@sentry/nextjs";

// Next.js loads this file in the browser before the app starts (it replaced
// sentry.client.config.ts, which Turbopack builds no longer pick up).

// Client bundle: only ever reads NEXT_PUBLIC_* env vars. Never add a
// server-only secret to this file — see tests/security/secrets.test.mjs,
// which scans every "use client" file for exactly this mistake.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    // Session replay is off by default for a student-data product; enable
    // deliberately and only with PII scrubbing configured if ever needed.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    beforeSend(event) {
      // Defense-in-depth: strip anything that looks like it captured a
      // request/response body rather than only a stack trace.
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
      }
      return event;
    },
  });
}

// Lets Sentry trace client-side navigations.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
