import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src/app/api");
const publicRoutes = new Set([
  "health/route.ts",
  "chat/stream/route.ts",
  "export/financial-snapshot/route.ts",
  "export/report-snapshot/route.ts",
  "export/report/route.ts",
  "financial/finalize/route.ts",
  "financial/preference/route.ts",
  "report/finalize/route.ts",
  "resume/generate/route.ts",
  "payments/stripe/webhook/route.ts",
  // Guarded by a short-lived, single-use pairing code instead of a session —
  // this is the one Companion route an unauthenticated extension can call,
  // analogous to the webhook above being guarded by a signature instead.
  "companion/pair/route.ts",
]);
const markers = ["auth.getUser", "requireApiUser", "requireApiProfile", "getApiStaff", "requireCurrentUser", "requireProfile", "requireCompanionAuth"];
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]); }

describe("API authorization structure", () => {
  for (const file of walk(root).filter((f) => f.endsWith("route.ts"))) {
    const rel = path.relative(root, file).replaceAll("\\", "/");
    if (publicRoutes.has(rel)) continue;
    it(`${rel} has an auth guard`, () => {
      const source = fs.readFileSync(file, "utf8");
      expect(markers.some((marker) => source.includes(marker))).toBe(true);
    });
  }
});
