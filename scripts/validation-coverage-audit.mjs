import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src/app/api");
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const routeFiles = walk(root).filter((candidate) => candidate.endsWith("route.ts"));
const failures = [];
const categories = { schemaValidated: 0, rawSignedWebhook: 0, noStructuredInput: 0 };

for (const file of routeFiles) {
  const source = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file).replaceAll("\\", "/");
  const usesCentralSchemas = source.includes('@/lib/validation/schemas');
  const parsesJson = /parseJsonBody\s*\(|request\.json\s*\(/.test(source);
  const parsesForm = /request\.formData\s*\(/.test(source);
  const readsQuery = /searchParams|parseSearchParams\s*\(/.test(source);
  const readsRawBody = /request\.text\s*\(/.test(source);
  const hasStructuredInput = parsesJson || parsesForm || readsQuery || readsRawBody;

  if (hasStructuredInput && !usesCentralSchemas) {
    failures.push(`${rel}: reads request input without @/lib/validation/schemas`);
    continue;
  }
  if (/request\.json\s*\(/.test(source)) {
    failures.push(`${rel}: direct request.json() is forbidden; use parseJsonBody with a central schema`);
    continue;
  }
  if (readsRawBody) {
    const signedWebhook =
      (rel === "payments/stripe/webhook/route.ts" && source.includes("stripeWebhookEventSchema") && source.includes("stripeSignatureSchema") && source.includes("verifyStripeSignature")) ||
      (rel === "resend/inbound/route.ts" && source.includes("resendInboundEventSchema") && source.includes("resendSignatureHeadersSchema") && source.includes("verifyResendWebhookSignature"));
    if (!signedWebhook) failures.push(`${rel}: raw request body is not an approved signed-webhook validation path`);
    else categories.rawSignedWebhook++;
    continue;
  }
  if (hasStructuredInput) categories.schemaValidated++;
  else categories.noStructuredInput++;
}

if (failures.length) {
  console.error("Validation coverage audit failed:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

const classified = categories.schemaValidated + categories.rawSignedWebhook + categories.noStructuredInput;
if (classified !== routeFiles.length) {
  console.error(`Validation coverage classification mismatch: ${classified}/${routeFiles.length}.`);
  process.exit(1);
}
console.log(`Validation coverage audit passed: ${classified}/${routeFiles.length} API routes classified; ${categories.schemaValidated} schema-validated request-input routes, ${categories.rawSignedWebhook} signed raw webhook route, ${categories.noStructuredInput} routes with no structured request input.`);
