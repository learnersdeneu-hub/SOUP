import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer reads connection URLs from schema.prisma or loads .env
// files itself. Load .env / .env.local the same way Next.js does, then point
// the CLI (migrate, db seed, studio) at DIRECT_URL — the direct, non-pooled
// connection migrations need, exactly what `directUrl` used to be. The app
// itself connects with DATABASE_URL through the driver adapter in
// src/lib/prisma.ts. url is optional so `prisma generate` still works on a
// machine with no database configured.
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
