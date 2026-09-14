import fs from "node:fs";
import path from "node:path";

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

// Count explicit TypeScript `any` constructs rather than English words inside comments,
// UI strings, prompts, or documentation. This is intentionally conservative and catches
// annotations/casts/generic uses such as `: any`, `as any`, `any[]`, and `<any>`.
const patterns = [
  /:\s*any\b/g,
  /\bas\s+any\b/g,
  /\bany\s*\[\s*\]/g,
  /\bArray\s*<\s*any\s*>/g,
  /<\s*any\s*>/g,
];
const files = walk(path.resolve("src")).filter((file) => /\.(ts|tsx)$/.test(file));
let count = 0;
const hits = [];
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  let fileCount = 0;
  for (const pattern of patterns) fileCount += (source.match(pattern) || []).length;
  if (fileCount) hits.push(`${path.relative(process.cwd(), file)}: ${fileCount}`);
  count += fileCount;
}
const budget = 0;
if (count > budget) {
  console.error(`Type-safety regression: ${count} explicit TypeScript 'any' usages exceeds budget ${budget}.`);
  for (const hit of hits) console.error(` - ${hit}`);
  process.exit(1);
}
console.log(`Type-safety budget passed: ${count} explicit TypeScript 'any' usages (budget ${budget}).`);
