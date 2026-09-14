import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const checks = [];
const add = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });

const gemini = read("src/lib/ai/providers/gemini.ts");
const route = read("src/app/api/conversation/stream/route.ts");
const policy = read("src/lib/ai/researchPolicy.ts");
const prompt = read("src/lib/conversation/prompts.ts");
const context = read("src/lib/context/studentContext.ts");
const env = read(".env.example");

add("Production Flash model default", gemini.includes('gemini-3.8-flash') && env.includes('gemini-3.8-flash'), "Gemini 3.8 Flash is the default in code and env template.");
add("Low-latency thinking for normal chat", route.includes('thinkingLevel: useWebResearch ? "medium" : "low"'), "Normal counselor chat uses low thinking; researched answers use medium.");
add("Bounded conversation history", route.includes("MAX_HISTORY_MESSAGES = 28") && route.includes("MAX_HISTORY_CHARS = 42_000"), "Prevents long sessions from making every turn progressively slower.");
add("Bounded structured context", context.includes("slice(0, 36_000)"), "Saved student context is capped before being sent to the model.");
add("Grounded research fallback", route.includes("RESEARCH FALLBACK") && route.includes("runAttempt(false, true)"), "If Google grounding fails before output, Noodles retries against saved data with an explicit no-current-facts rule.");
add("Public-only research trigger", policy.includes("PUBLIC_ONLY_CUES") && policy.includes("STRICT_BUDGET_CUES"), "Public/government-only and tight-budget counseling can automatically broaden to live research.");
add("No shortlist padding", prompt.includes("Ten is a target, never padding"), "Noodles is told not to fabricate a ten-option list.");
add("Partner priority is suitability-gated", prompt.includes("Partner status may improve the ranking of an already-suitable option; it must never make an unsuitable option suitable."), "Suitable SOUP-network universities are deliberately prioritized without violating hard constraints.");
add("Streaming endpoint", gemini.includes(":streamGenerateContent?alt=sse"), "Token streaming remains enabled for fast perceived response.");
add("Retry on transient provider start failure", gemini.includes("for (let attempt = 0; attempt < 3; attempt++)") && gemini.includes("retryableStatus"), "Transient 408/409/429/5xx failures retry before failing the request.");

let failed = 0;
for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"}  ${check.name} — ${check.detail}`);
  if (!check.pass) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} AI readiness checks passed.`);
if (failed) process.exit(1);
