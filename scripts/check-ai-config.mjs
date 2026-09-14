import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const provider = (process.env.AI_PROVIDER || "gemini").trim().toLowerCase();
if (provider === "gemini") {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    console.error("GEMINI_API_KEY is not set. Add it to .env.local (server-side only).");
    process.exit(1);
  }
  console.log(`AI provider configured: gemini (GEMINI_API_KEY present, model=${process.env.AI_MODEL?.trim() || "gemini-3.7-flash"})`);
} else if (provider === "openai") {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error("OPENAI_API_KEY is not set. Add it to .env.local (server-side only).");
    process.exit(1);
  }
  console.log(`AI provider configured: openai (OPENAI_API_KEY present, model=${process.env.AI_MODEL?.trim() || "gpt-4o"})`);
} else {
  console.error(`Unsupported AI_PROVIDER=${provider || "empty"}. Use gemini or openai.`);
  process.exit(1);
}
