import { describe, expect, it, afterAll } from "vitest";
import { Prisma } from "@prisma/client";

// Opt-in database smoke test: runs only when SOUP_DB_SMOKE_URL points at a
// disposable, migrated Postgres (never production — it creates and deletes
// rows). It exercises the Prisma features the app relies on — relations and
// nested includes, JSON columns, enums, Decimal, raw SQL, interactive and
// batch transactions, and real query modules — and was used to verify the
// Prisma 5 → 7 upgrade.
//   SOUP_DB_SMOKE_URL=postgresql://... npx vitest run tests/integration
const url = process.env.SOUP_DB_SMOKE_URL;
if (url) {
  process.env.DATABASE_URL = url;
  process.env.DIRECT_URL = url;
}

describe.skipIf(!url)("database smoke (Prisma)", async () => {
  const { prisma } = await import("@/lib/prisma");
  const { getCustomerDashboardData, getAdminDashboardData } = await import("@/lib/queries/dashboard");
  const { checkRateLimit } = await import("@/lib/ai/rateLimiter");
  const email = `smoke-${Date.now()}@example.test`;

  afterAll(async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
      if (profile) {
        await prisma.chatSession.deleteMany({ where: { profileId: profile.id } });
        await prisma.profile.delete({ where: { id: profile.id } });
      }
      await prisma.user.delete({ where: { id: user.id } });
    }
    await prisma.$disconnect();
  });

  it("runs raw SQL", async () => {
    const rows = await prisma.$queryRaw<Array<{ one: number }>>`SELECT 1::int AS one`;
    expect(rows[0].one).toBe(1);
  });

  it("reads catalog data with nested includes and JSON", async () => {
    const universities = await prisma.university.findMany({
      include: { partner: true, programs: { where: { active: true }, select: { id: true, publicMetadata: true } } },
      orderBy: { name: "asc" },
      take: 25,
    });
    expect(universities.length).toBeGreaterThan(0);
    const count = await prisma.university.count();
    const partners = await prisma.partner.groupBy({ by: ["type"], _count: true });
    expect(count).toBeGreaterThan(0);
    expect(partners.length).toBeGreaterThan(0);
  });

  it("writes and reads a user, profile, JSON and enums in a transaction", async () => {
    const profile = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { email, fullName: "Smoke Test" } });
      return tx.profile.create({ data: { userId: user.id, communicationPreferences: { email: true, tags: ["a", "b"] } } });
    });
    const reread = await prisma.profile.findUnique({ where: { id: profile.id }, include: { user: true } });
    expect(reread?.user.email).toBe(email);
    expect(reread?.communicationPreferences).toEqual({ email: true, tags: ["a", "b"] });

    await prisma.$transaction([
      prisma.chatSession.create({ data: { profileId: profile.id, workflow: "COUNSELOR", title: "smoke" } }),
      prisma.profile.update({ where: { id: profile.id }, data: { communicationPreferences: Prisma.JsonNull } }),
    ]);
    const cleared = await prisma.profile.findUnique({ where: { id: profile.id } });
    expect(cleared?.communicationPreferences).toBeNull();
  });

  it("runs the real dashboard queries", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const dashboard = await getCustomerDashboardData(user.id);
    expect(dashboard?.profile.user.email).toBe(email);
    const admin = await getAdminDashboardData();
    expect(admin).toBeTruthy();
  });

  it("runs the raw-SQL rate limiter (upsert + RETURNING)", async () => {
    const request = new Request("http://localhost/", { headers: { "x-forwarded-for": `198.51.100.${Date.now() % 250}` } });
    await expect(checkRateLimit(request, null)).resolves.toBeUndefined();
  });

  it("reads Decimal columns", async () => {
    const band = await prisma.scoreBand.findFirst();
    if (band) expect(Number(band.minValue)).not.toBeNaN();
  });
});
