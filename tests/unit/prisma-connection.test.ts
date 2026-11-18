import { describe, expect, it } from "vitest";
import { prismaPoolConfig } from "@/lib/prismaConnection";

describe("prismaPoolConfig", () => {
  it("translates a Supabase pooler URL with Prisma-only parameters", () => {
    const { pool, schema } = prismaPoolConfig("postgresql://u:p@aws-0-eu.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require&schema=public");
    expect(pool.max).toBe(1);
    expect(schema).toBe("public");
    expect(pool.ssl).toEqual({ rejectUnauthorized: false });
    expect(pool.connectionString).toBe("postgresql://u:p@aws-0-eu.pooler.supabase.com:6543/postgres");
  });

  it("leaves a plain URL and strict sslmodes alone", () => {
    expect(prismaPoolConfig("postgresql://u:p@localhost:5432/db")).toEqual({ pool: { connectionString: "postgresql://u:p@localhost:5432/db" }, schema: undefined });
    const strict = prismaPoolConfig("postgresql://u:p@db.example.com:5432/db?sslmode=verify-full");
    expect(strict.pool.ssl).toBeUndefined();
    expect(strict.pool.connectionString).toContain("sslmode=verify-full");
  });

  it("converts connect_timeout seconds to milliseconds", () => {
    expect(prismaPoolConfig("postgresql://u:p@h/db?connect_timeout=10").pool.connectionTimeoutMillis).toBe(10_000);
  });
});

describe("script and app connection settings agree", () => {
  it("prisma/client.cjs poolConfig matches src/lib/prismaConnection.ts", async () => {
    const { poolConfig } = await import("../../prisma/client.cjs");
    for (const url of [
      "postgresql://u:p@aws-0-eu.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require&schema=public",
      "postgresql://u:p@localhost:5432/db",
      "postgresql://u:p@db.example.com:5432/db?sslmode=verify-full&connect_timeout=5",
    ]) {
      expect(poolConfig(url)).toEqual(prismaPoolConfig(url));
    }
  });
});
