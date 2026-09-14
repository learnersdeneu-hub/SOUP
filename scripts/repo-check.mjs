import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const notes = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function resolveAlias(spec) {
  if (!spec.startsWith('@/')) return true;
  const base = path.join(root, 'src', spec.slice(2));
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')];
  return candidates.some((candidate) => fs.existsSync(candidate));
}

const sourceFiles = walk(path.join(root, 'src')).filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/(?:from\s+|import\s*\(\s*)["'](@\/[^"']+)["']/g)) {
    if (!resolveAlias(match[1])) errors.push(`Unresolved internal import ${match[1]} in ${path.relative(root, file)}`);
  }
}

const routePages = walk(path.join(root, 'src', 'app')).filter((f) => /page\.tsx?$/.test(f));
const routes = new Set(routePages.map((file) => {
  let rel = path.relative(path.join(root, 'src', 'app'), path.dirname(file)).replaceAll('\\', '/');
  rel = rel.replace(/\([^/]+\)\/?/g, '').replace(/\/+/g, '/');
  return rel ? `/${rel}` : '/';
}));
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/(?:href=|redirect\(|router\.(?:push|replace)\()[{\s]*["'`]([^"'`?#]+)["'`]/g)) {
    const href = match[1];
    if (!href.startsWith('/') || href.includes('${') || href.startsWith('/api/')) continue;
    const normalized = href.replace(/\/$/, '') || '/';
    if (routes.has(normalized)) continue;
    const dynamicMatch = [...routes].some((route) => {
      const pattern = '^' + route.replace(/\[[^/]+\]/g, '[^/]+') + '$';
      return new RegExp(pattern).test(normalized);
    });
    if (!dynamicMatch) notes.push(`Route reference not statically matched: ${href} in ${path.relative(root, file)}`);
  }
}

const envText = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
const declared = new Set([...envText.matchAll(/^([A-Z0-9_]+)=/gm)].map((m) => m[1]));
const used = new Set();
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/process\.env\.([A-Z0-9_]+)/g)) used.add(match[1]);
}
for (const key of used) if (!declared.has(key) && key !== 'NODE_ENV') errors.push(`Environment variable ${key} is used but missing from .env.example`);


for (const file of sourceFiles) {
  const rel = path.relative(root, file).replaceAll('\\', '/');
  const text = fs.readFileSync(file, 'utf8');
  if (!rel.startsWith('src/lib/ai/providers/') && rel !== 'src/lib/ai/registry.ts') {
    if (/@anthropic-ai\/sdk|@google\/generative-ai|from\s+["']openai["']/.test(text)) {
      errors.push(`Provider SDK imported outside AI provider boundary: ${rel}`);
    }
  }
}
if (used.has('ANTHROPIC_API_KEY') || fs.existsSync(path.join(root, 'src/lib/ai/providers/anthropic.ts'))) {
  errors.push('Anthropic runtime residue remains in canonical Gemini pilot repository');
}

const schema = fs.readFileSync(path.join(root, 'prisma', 'schema.prisma'), 'utf8');
const mappedTables = [...schema.matchAll(/@@map\("([^"]+)"\)/g)].map((m) => m[1]);
const migrationFiles = walk(path.join(root, 'prisma', 'migrations')).filter((f) => f.endsWith('migration.sql'));
const allSql = migrationFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
for (const table of mappedTables) {
  if (!allSql.includes(`"${table}"`)) errors.push(`Mapped Prisma table ${table} is absent from migration SQL`);
}

const required = [
  'prisma/migrations/20260801000000_core_baseline/migration.sql',
  'prisma/seed.js',
  'docs/migration-baseline.md',
];
for (const file of required) if (!fs.existsSync(path.join(root, file))) errors.push(`Missing required infrastructure file: ${file}`);

if (errors.length) {
  console.error('Repository consistency check FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Repository consistency check PASSED (${sourceFiles.length} source files, ${routePages.length} routes, ${migrationFiles.length} migrations).`);
if (notes.length) {
  console.log('Non-blocking route notes:');
  for (const note of [...new Set(notes)].slice(0, 30)) console.log(`- ${note}`);
}
