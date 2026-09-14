import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
        ],
      },
    ];
  },
};

// withSentryConfig is a no-op passthrough at runtime if SENTRY_DSN /
// NEXT_PUBLIC_SENTRY_DSN are unset (see sentry.*.config.ts), so this is safe
// to ship even before a Sentry project is provisioned. Source map upload
// only runs when SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT are set in
// the build environment (e.g. Vercel), which keeps local `next build` fast.
export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: false,
  disableLogger: true,
  automaticVercelMonitors: false,
});
