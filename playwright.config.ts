import { defineConfig, devices } from "@playwright/test";

// E2E tests need a running instance of the app plus a real, disposable
// Supabase test project (see tests/e2e/README.md — the same "documented but
// not fakeable in a sandbox" pattern used for the RLS live-verification
// script). They are intentionally NOT part of `verify:deploy`, which must
// stay deterministic and credential-free; run them as a separate CI job or
// locally against a seeded test environment.
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3001";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Only auto-starts a dev server when running locally against a
  // developer-configured .env.local; CI supplies its own already-running
  // preview deployment via E2E_BASE_URL instead.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
