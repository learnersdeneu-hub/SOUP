import fs from "node:fs";
import path from "node:path";

const apiRoot = path.resolve("src/app/api");
const publicAllowlist = new Set([
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
  // Guarded by a Svix signature over the Resend webhook secret instead of a
  // session, same as the Stripe webhook above — this is a server-to-server
  // delivery with no signed-in user to require.
  "resend/inbound/route.ts",
  // Guarded by a short-lived, single-use pairing code instead of a session —
  // analogous to the webhook above being guarded by a signature instead.
  "companion/pair/route.ts",
]);

const authMarkers = [
  "auth.getUser",
  "requireApiUser",
  "requireApiProfile",
  "getApiStaff",
  "requireCurrentUser",
  "requireProfile",
  "requireCompanionAuth",
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const failures = [];
for (const file of walk(apiRoot).filter((file) => file.endsWith("route.ts"))) {
  const relative = path.relative(apiRoot, file).replaceAll("\\", "/");
  if (publicAllowlist.has(relative)) continue;
  const source = fs.readFileSync(file, "utf8");
  if (!authMarkers.some((marker) => source.includes(marker))) failures.push(relative);
}

if (failures.length) {
  console.error("Protected API routes without a recognized auth guard:\n" + failures.map((f) => `- ${f}`).join("\n"));
  process.exit(1);
}
console.log(`Auth route audit passed: every non-public API route has an authentication guard.`);
