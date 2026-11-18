import type { PoolConfig } from "pg";

// Translates a Prisma-5-style Postgres URL into node-postgres pool settings
// for the Prisma 7 driver adapter, keeping the behaviour the app had on
// Prisma 5 (Supabase URLs carry Prisma-only query parameters):
// - pgbouncer=true, pool_timeout, statement_cache_size: Prisma engine
//   options; node-postgres has no equivalent and doesn't need one (it uses
//   unnamed prepared statements, which the Supabase transaction pooler
//   accepts), so they're dropped.
// - connection_limit=N becomes the pool's max size.
// - schema=X is returned separately for the adapter's schema option.
// - sslmode=require/prefer/no-verify: Prisma 5 encrypted without verifying
//   the certificate chain. Newer node-postgres treats "require" as full
//   verification, which rejects Supabase's own CA — so these keep
//   encryption without chain verification, exactly as before.
//   verify-ca / verify-full are left to node-postgres unchanged.
export function prismaPoolConfig(databaseUrl: string): { pool: PoolConfig; schema?: string } {
  const url = new URL(databaseUrl);
  const params = url.searchParams;
  const pool: PoolConfig = {};

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
