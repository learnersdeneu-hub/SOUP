// Prisma client factory for the Node scripts in prisma/ and scripts/ (seed,
// catalog imports). Prisma 7 requires a driver adapter and no longer loads
// .env itself, so this loads .env/.env.local like Next.js does and connects
// through @prisma/adapter-pg.
//
// poolConfig() mirrors src/lib/prismaConnection.ts (the app's version, in
// TypeScript); tests/unit/prisma-connection.test.ts checks they agree.
const { loadEnvConfig } = require("@next/env");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

function poolConfig(databaseUrl) {
  const url = new URL(databaseUrl);
  const params = url.searchParams;
  const pool = {};
  const limit = Number(params.get("connection_limit"));
  if (Number.isInteger(limit) && limit > 0) pool.max = limit;
  const schema = params.get("schema") || undefined;
  const sslmode = params.get("sslmode");
  if (sslmode === "require" || sslmode === "prefer" || sslmode === "no-verify") {
    pool.ssl = { rejectUnauthorized: false };
    params.delete("sslmode");
  }
  for (const key of ["pgbouncer", "connection_limit", "pool_timeout", "statement_cache_size", "schema", "connect_timeout", "socket_timeout"]) {
    if (key === "connect_timeout") {
      const seconds = Number(params.get(key));
      if (Number.isFinite(seconds) && seconds > 0) pool.connectionTimeoutMillis = seconds * 1000;
    }
    params.delete(key);
  }
  pool.connectionString = url.toString();
  return { pool, schema };
}

// Scripts do bulk writes, so they prefer the direct connection when one is
// configured (same choice as prisma.config.ts for migrations).
function createPrismaClient() {
  loadEnvConfig(process.cwd());
  const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Set DATABASE_URL (or DIRECT_URL) in the environment or .env.local.");
  const { pool, schema } = poolConfig(databaseUrl);
  return new PrismaClient({ adapter: new PrismaPg(pool, schema ? { schema } : undefined) });
}

module.exports = { createPrismaClient, poolConfig };
