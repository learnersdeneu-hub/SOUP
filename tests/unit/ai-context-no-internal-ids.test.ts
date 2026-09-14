import { beforeEach, describe, expect, it, vi } from "vitest";

// Regression test for a real leak: a raw database id (e.g.
// "[1526bbd5-a108-4562-890e-caf9e3d863bc]") appeared verbatim in a live
// Noodles recommendation, because the university/program/partner data fed
// into the AI's saved-context JSON included an `id` field with nothing
// stopping the model from echoing it back. These functions are consumed only
// to build that AI context (never by any UI), so their Prisma `select`
// clauses must never request an internal id at any nesting level.

const prismaMock = vi.hoisted(() => ({
  partner: { findMany: vi.fn(async (_args: { select?: unknown }) => [] as unknown[]) },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { getActiveServicePartners, getRelevantUniversityPartners } from "../../src/lib/partners/relevance";

function collectSelectedFields(select: unknown, path = ""): string[] {
  if (!select || typeof select !== "object") return [];
  const out: string[] = [];
  for (const [key, value] of Object.entries(select as Record<string, unknown>)) {
    if (key === "where" || key === "take" || key === "orderBy") continue;
    const fullPath = path ? `${path}.${key}` : key;
    if (value === true) out.push(fullPath);
    else if (value && typeof value === "object" && "select" in (value as Record<string, unknown>)) {
      out.push(...collectSelectedFields((value as { select: unknown }).select, fullPath));
    }
  }
  return out;
}

describe("AI-context queries never select internal database ids", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getRelevantUniversityPartners never selects id at any nesting level (partner, university, or program)", async () => {
    await getRelevantUniversityPartners(null, 10);
    const args = prismaMock.partner.findMany.mock.calls[0][0];
    const fields = collectSelectedFields(args.select);
    expect(fields.filter((f) => f.endsWith(".id") || f === "id")).toEqual([]);
  });

  it("getActiveServicePartners never selects id", async () => {
    await getActiveServicePartners();
    const args = prismaMock.partner.findMany.mock.calls[0][0];
    const fields = collectSelectedFields(args.select);
    expect(fields.filter((f) => f.endsWith(".id") || f === "id")).toEqual([]);
  });
});
