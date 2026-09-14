import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("Sentry config boundaries", () => {
  it("client config never reads a server-only secret", () => {
    const source = fs.readFileSync("sentry.client.config.ts", "utf8");
    expect(source).not.toMatch(/GEMINI_API_KEY|SUPABASE_SECRET_KEY|STRIPE_SECRET_KEY|RESEND_API_KEY|DATABASE_URL|DIRECT_URL|SENTRY_AUTH_TOKEN|(?<!NEXT_PUBLIC_)\bSENTRY_DSN\b/);
  });

  it("client, server, and edge configs skip Sentry.init when DSN is unset", () => {
    for (const file of ["sentry.client.config.ts", "sentry.server.config.ts", "sentry.edge.config.ts"]) {
      const source = fs.readFileSync(file, "utf8");
      expect(source).toMatch(/if\s*\(\s*dsn\s*\)/);
    }
  });
});
