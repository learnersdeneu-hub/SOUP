import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const errors = [];
const warnings = [];
const required = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SECRET_KEY",
  "GEMINI_API_KEY",
  "SOUP_RATE_LIMIT_SALT",
];

for (const key of required) {
  const value = String(process.env[key] || "").trim();
  if (!value) errors.push(`${key} is missing.`);
  if (/\[[^\]]+\]|example\.com|sb_publishable_\.\.\./i.test(value)) errors.push(`${key} still contains a placeholder/example value.`);
}

function safeUrl(key) {
  const raw = String(process.env[key] || "").trim();
  if (!raw) return null;
  try { return new URL(raw); }
  catch { errors.push(`${key} is not a valid URL.`); return null; }
}

const site = safeUrl("NEXT_PUBLIC_SITE_URL");
const supabase = safeUrl("NEXT_PUBLIC_SUPABASE_URL");
const database = safeUrl("DATABASE_URL");
const direct = safeUrl("DIRECT_URL");

if (site && !["http:", "https:"].includes(site.protocol)) errors.push("NEXT_PUBLIC_SITE_URL must use http:// or https://.");
if (supabase && (supabase.protocol !== "https:" || !supabase.hostname.endsWith(".supabase.co"))) errors.push("NEXT_PUBLIC_SUPABASE_URL must be the HTTPS URL of the new SOUP Supabase project.");
if (database && !["postgres:", "postgresql:"].includes(database.protocol)) errors.push("DATABASE_URL must be PostgreSQL.");
if (direct && !["postgres:", "postgresql:"].includes(direct.protocol)) errors.push("DIRECT_URL must be PostgreSQL.");

const projectRef = supabase?.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i)?.[1] || null;
if (projectRef) {
  for (const [key, url] of [["DATABASE_URL", database], ["DIRECT_URL", direct]]) {
    if (!url) continue;
    const searchable = `${url.username}@${url.hostname}`.toLowerCase();
    if (!searchable.includes(projectRef.toLowerCase())) errors.push(`${key} does not appear to belong to the same Supabase project ref (${projectRef}) as NEXT_PUBLIC_SUPABASE_URL.`);
  }
}

const salt = String(process.env.SOUP_RATE_LIMIT_SALT || "");
if (salt && salt.length < 24) errors.push("SOUP_RATE_LIMIT_SALT should be at least 24 characters long.");
const provider = String(process.env.AI_PROVIDER || "gemini").trim().toLowerCase();
if (provider !== "gemini") warnings.push(`AI_PROVIDER is ${provider}; the launch configuration and live QA are benchmarked on Gemini.`);
if (process.env.RESEND_API_KEY && /example\.com/i.test(String(process.env.SOUP_EMAIL_FROM || ""))) errors.push("SOUP_EMAIL_FROM must use your verified sending domain when RESEND_API_KEY is configured.");
if (process.env.NODE_ENV === "production" && site?.hostname === "localhost") errors.push("Production NEXT_PUBLIC_SITE_URL cannot be localhost.");

if (errors.length) {
  console.error("SOUP preflight FAILED");
  for (const error of errors) console.error(`- ${error}`);
  if (warnings.length) for (const warning of warnings) console.warn(`WARNING: ${warning}`);
  process.exit(1);
}
console.log(`SOUP preflight PASSED${projectRef ? ` for Supabase project ${projectRef}` : ""}.`);
for (const warning of warnings) console.warn(`WARNING: ${warning}`);
