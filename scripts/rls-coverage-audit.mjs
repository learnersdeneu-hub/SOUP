import fs from "node:fs";
import path from "node:path";

const schemaPath = path.resolve("prisma/schema.prisma");
const migrationsDir = path.resolve("prisma/migrations");
const schema = fs.readFileSync(schemaPath, "utf8");

const scopedTables = [];
for (const match of schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
  const [, model, body] = match;
  if (!/^\s*(profileId|userId)\s+/m.test(body)) continue;
  const mapped = body.match(/@@map\("([^"]+)"\)/)?.[1] ?? model;
  scopedTables.push(mapped);
}

const sql = fs.readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(migrationsDir, entry.name, "migration.sql"))
  .filter(fs.existsSync)
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");

const enabled = new Set(
  [...sql.matchAll(/ALTER\s+TABLE\s+"([^"]+)"\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi)].map((match) => match[1]),
);
const missing = scopedTables.filter((table) => !enabled.has(table));
if (missing.length) {
  console.error(`RLS coverage audit failed. Direct user-scoped tables without ENABLE ROW LEVEL SECURITY: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`RLS coverage audit passed: ${scopedTables.length}/${scopedTables.length} direct profileId/userId tables enable RLS.`);
