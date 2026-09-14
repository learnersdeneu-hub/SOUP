import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Next.js compiles JSX with the automatic runtime (no explicit `React`
  // import needed per file); Vitest's own esbuild transform must be told the
  // same thing, or a test that renders a component (e.g. via
  // react-dom/server) fails with "React is not defined" even though the real
  // Next.js build is unaffected.
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.{test,spec}.{ts,tsx,mjs}"],
    // tests/e2e/*.spec.ts are Playwright specs (run via `npm run test:e2e`),
    // not Vitest tests — they import from "@playwright/test", which Vitest
    // cannot execute. Without this exclusion, `npm run test` would try to
    // run them and fail with an unrelated-looking error.
    exclude: ["tests/e2e/**", "node_modules/**"],
    restoreMocks: true,
  },
});
