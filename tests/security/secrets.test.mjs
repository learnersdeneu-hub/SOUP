import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]); }

describe("client secret boundaries", () => {
  for (const file of walk(path.resolve("src")).filter((f) => /\.(ts|tsx)$/.test(f))) {
    const source = fs.readFileSync(file, "utf8");
    if (!source.includes('"use client"') && !source.includes("'use client'")) continue;
    it(`${path.relative(process.cwd(), file)} does not reference server secrets`, () => {
      expect(source).not.toMatch(/GEMINI_API_KEY|SUPABASE_SECRET_KEY|STRIPE_SECRET_KEY|RESEND_API_KEY|DATABASE_URL|DIRECT_URL/);
    });
  }
});
