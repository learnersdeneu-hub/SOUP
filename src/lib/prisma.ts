import { PrismaClient } from "@prisma/client";

// Prisma uses DATABASE_URL for normal server-side queries; DIRECT_URL is reserved
// for Prisma migration/introspection workflows. These calls run only in trusted
// backend code (Server Components, Server Actions, Route Handlers). Because Prisma
// connects directly to Postgres rather than through the Supabase client, every
// privileged path must keep enforcing ownership/role checks server-side.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
