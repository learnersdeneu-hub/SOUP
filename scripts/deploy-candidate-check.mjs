import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const src = path.join(root, "src");
const failures = [];
const passes = [];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function pass(label) { passes.push(label); }
function fail(label, detail) { failures.push({ label, detail }); }
function expect(label, condition, detail = "") { condition ? pass(label) : fail(label, detail); }

const files = walk(src).filter((file) => /\.(ts|tsx)$/.test(file));
const fileText = new Map(files.map((file) => [file, fs.readFileSync(file, "utf8")]));
const envExample = fs.readFileSync(path.join(root, ".env.example"), "utf8");

// Route map and static Link/href integrity.
const pageFiles = files.filter((file) => file.includes(`${path.sep}app${path.sep}`) && file.endsWith(`${path.sep}page.tsx`));
const routes = pageFiles.map((file) => {
  let rel = path.relative(path.join(src, "app"), path.dirname(file)).split(path.sep).filter((part) => !(part.startsWith("(") && part.endsWith(")")));
  return "/" + rel.join("/");
}).map((route) => route === "/." ? "/" : route);

function matchesRoute(href) {
  const clean = href.split(/[?#]/)[0];
  return routes.some((route) => {
    const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\[[^/]+?\\\]/g, "[^/]+");
    return new RegExp(`^${escaped}$`).test(clean);
  });
}

const badLinks = [];
for (const [file, text] of fileText) {
  for (const match of text.matchAll(/href\s*=\s*["'](\/[^"']*)["']/g)) {
    const href = match[1];
    if (href.startsWith("/api/")) continue;
    if (!matchesRoute(href)) badLinks.push(`${path.relative(root, file)} -> ${href}`);
  }
}
expect("Static internal links resolve to application pages", badLinks.length === 0, badLinks.join("\n"));

// Static HTML form endpoints must map to an implemented API route.
const apiRouteFiles = files.filter((file) => file.includes(`${path.sep}app${path.sep}api${path.sep}`) && file.endsWith(`${path.sep}route.ts`));
const apiRoutes = apiRouteFiles.map((file) => {
  const rel = path.relative(path.join(src, "app"), path.dirname(file)).split(path.sep);
  return "/" + rel.join("/");
});
function matchesApiRoute(action) {
  const clean = action.split(/[?#]/)[0];
  return apiRoutes.some((route) => {
    const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\[[^/]+?\\\]/g, "[^/]+");
    return new RegExp(`^${escaped}$`).test(clean);
  });
}
const badFormActions = [];
for (const [file, text] of fileText) {
  for (const match of text.matchAll(/<form[^>]+action\s*=\s*["'](\/api\/[^"']*)["']/g)) {
    if (!matchesApiRoute(match[1])) badFormActions.push(`${path.relative(root, file)} -> ${match[1]}`);
  }
}
expect("Static POST form endpoints resolve to API routes", badFormActions.length === 0, badFormActions.join("\n"));

// New-window links must block opener/referrer leakage.
const unsafeBlankLinks = [];
for (const [file, text] of fileText) {
  for (const match of text.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/g)) {
    if (!/rel=["'][^"']*(?:noreferrer|noopener)[^"']*["']/.test(match[0])) unsafeBlankLinks.push(path.relative(root, file));
  }
}
expect("New-window links use noreferrer/noopener", unsafeBlankLinks.length === 0, [...new Set(unsafeBlankLinks)].join("\n"));

// Environment contract completeness.
const envRefs = new Set();
for (const text of fileText.values()) for (const m of text.matchAll(/process\.env\.([A-Z0-9_]+)/g)) envRefs.add(m[1]);
const missingEnvDocs = [...envRefs].filter((name) => name !== "NODE_ENV" && !envExample.includes(`${name}=`));
expect("Every runtime env var is documented in .env.example", missingEnvDocs.length === 0, missingEnvDocs.join(", "));

// Secrets never referenced in Client Components.
const clientSecretHits = [];
for (const [file, text] of fileText) {
  if (!/^\s*["']use client["'];/m.test(text)) continue;
  if (/GEMINI_API_KEY|SUPABASE_SECRET_KEY|STRIPE_SECRET_KEY|RESEND_API_KEY|DATABASE_URL|DIRECT_URL/.test(text)) clientSecretHits.push(path.relative(root, file));
}
expect("Client Components do not reference server secrets", clientSecretHits.length === 0, clientSecretHits.join("\n"));

// Console payload hygiene.
const rawConsoleLogs = [];
for (const [file, text] of fileText) {
  if (/console\.log\(/.test(text)) rawConsoleLogs.push(path.relative(root, file));
}
expect("No production source console.log calls", rawConsoleLogs.length === 0, rawConsoleLogs.join("\n"));

// Critical routes and product surfaces.
const criticalRoutes = [
  "/", "/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/dashboard", "/counselor",
  "/universities", "/universities/[id]", "/plans", "/applications", "/offers", "/visa", "/documents",
  "/payments", "/support", "/account", "/notifications", "/sessions", "/premium",
  "/admin", "/admin/applications", "/admin/documents", "/admin/support", "/admin/concierge", "/admin/settings",
];
const missingRoutes = criticalRoutes.filter((route) => !routes.includes(route));
expect("Critical student and staff pages exist", missingRoutes.length === 0, missingRoutes.join(", "));

// Auth recovery flow.
const authAction = fs.readFileSync(path.join(src, "app/actions/auth.ts"), "utf8");
const authCallback = fs.readFileSync(path.join(src, "app/auth/callback/route.ts"), "utf8");
expect("Password reset email flow is wired", authAction.includes("resetPasswordForEmail") && authAction.includes("/auth/callback?next=/reset-password"));
expect("Password reset completion signs out recovery session", authAction.includes("updateUser({ password })") && authAction.includes("auth.signOut"));
expect("Auth callback exchanges PKCE code for session", authCallback.includes("exchangeCodeForSession"));

// University detail completeness.
const universityDetail = fs.readFileSync(path.join(src, "app/universities/[id]/page.tsx"), "utf8");
expect("University detail shows logo", universityDetail.includes("<PartnerLogo"));
expect("University detail shows fee range", universityDetail.includes('label="Fee range"'));
expect("University detail shows intakes", universityDetail.includes('label="Intakes"'));
expect("University detail exposes official website when known", universityDetail.includes("Official website"));
expect("University detail handles missing live program data", universityDetail.includes("Search current programs"));

// Responsive shell guards.
const globals = fs.readFileSync(path.join(src, "app/globals.css"), "utf8");
const header = fs.readFileSync(path.join(src, "components/Header.tsx"), "utf8");
const support = fs.readFileSync(path.join(src, "components/support/SupportLauncher.tsx"), "utf8");
expect("Global shell prevents accidental horizontal viewport overflow", globals.includes("overflow-x: hidden"));
expect("Header has compact mobile actions", header.includes("sm:hidden") && header.includes("hidden sm:inline"));
expect("Support launcher is mobile-width bounded", support.includes("left-4 right-4") && support.includes("max-w-[320px]"));

// Brand assets.
expect("SOUP wordmark exists", fs.existsSync(path.join(root, "public/brand/soup-logo.png")));
expect("SOUP app mark exists", fs.existsSync(path.join(root, "public/brand/soup-mark.png")));

for (const label of passes) console.log(`PASS  ${label}`);
if (failures.length) {
  for (const item of failures) console.error(`FAIL  ${item.label}${item.detail ? `\n${item.detail}` : ""}`);
  console.error(`\n${passes.length}/${passes.length + failures.length} deploy-candidate checks passed.`);
  process.exit(1);
}
console.log(`\n${passes.length}/${passes.length} deploy-candidate checks passed.`);
