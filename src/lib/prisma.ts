import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { prismaPoolConfig } from "@/lib/prismaConnection";

// Prisma uses DATABASE_URL for normal server-side queries; DIRECT_URL is reserved
// for Prisma migration/introspection workflows (see prisma.config.ts). These calls
// run only in trusted backend code (Server Components, Server Actions, Route
// Handlers). Because Prisma connects directly to Postgres rather than through the
// Supabase client, every privileged path must keep enforcing ownership/role checks
// server-side.
//
// Since Prisma 7 the client talks to Postgres through the node-postgres driver
// adapter rather than a bundled query engine.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const { pool, schema } = prismaPoolConfig(process.env.DATABASE_URL || "postgresql://localhost:5432/postgres");
  return new PrismaClient({
    adapter: new PrismaPg(pool, schema ? { schema } : undefined),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
