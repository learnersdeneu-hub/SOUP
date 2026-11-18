// Syntax/parse check for every TypeScript/TSX file under src/ and scripts/.
// TypeScript 7 no longer ships a JavaScript API (ts.transpileModule), so this
// runs the tsc binary and reports only syntax errors (TS1xxx codes) — type
// errors are `npm run typecheck`'s job.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const roots = ["src", "scripts"];
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) files.push(file);
  }
}
for (const root of roots) if (fs.existsSync(root)) walk(root);

const tsc = path.join("node_modules", ".bin", process.platform === "win32" ? "tsc.cmd" : "tsc");
const result = spawnSync(tsc, ["--noEmit", "--pretty", "false", "-p", "tsconfig.json"], { encoding: "utf8", shell: process.platform === "win32" });
if (result.error) {
  console.error(`Could not run tsc: ${result.error.message}`);
  process.exit(1);
}

const syntaxErrors = `${result.stdout}${result.stderr}`
  .split("\n")
  .filter((line) => /error TS1\d{3}:/.test(line));

if (syntaxErrors.length) {
  console.error(syntaxErrors.join("\n"));
  process.exit(1);
}
console.log(`PASS syntax/transpile parse for ${files.length} TypeScript/TSX files`);
