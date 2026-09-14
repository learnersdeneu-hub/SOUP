# Node 24 helper compatibility fix

Live Dell QA exposed that `@next/env` is CommonJS under the installed Next.js 14.2.35 package, so Node 24 rejects ESM named imports such as `import { loadEnvConfig } from "@next/env"`.

Fixed files:
- `scripts/prisma-local.mjs`
- `scripts/check-ai-config.mjs`

Both now load `@next/env` via `createRequire(import.meta.url)`, which is compatible with the installed CommonJS module.

Validation performed after the fix:
- `node --check scripts/prisma-local.mjs` — pass
- `node --check scripts/check-ai-config.mjs` — pass
- `node scripts/repo-check.mjs` — pass (119 source files, 28 routes, 10 migrations)
- `node scripts/deep-check.mjs` — 16/16 invariants pass
