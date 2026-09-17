import { prisma } from "@/lib/prisma";
import { requireApiProfile } from "@/lib/auth/apiUser";

export const runtime = "nodejs";

// Backs the Direct Application autocomplete (see DirectApplicationBox).
// Split out of the dashboard's server render specifically so the full
// university catalog — 300+ rows, each with a nested partner + program
// lookup — is no longer fetched on every dashboard page load for a feature
// most visits never touch. Cached at the edge: this data changes rarely
// (new universities/programs are an admin action, not a per-request event),
// so repeat dashboard visits mostly hit cache instead of the database.
export async function GET() {
  const current = await requireApiProfile();
  if (!current.ok) return current.response;

  const universities = await prisma.university.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, country: true, city: true,
      partner: { select: { status: true, type: true } },
      programs: { where: { active: true }, take: 20, select: { id: true, title: true, level: true, intake: true } },
    },
  });

  const payload = universities.map((u) => ({
    id: u.id,
    name: u.name,
    country: u.country,
    city: u.city,
    isPartner: Boolean(u.partner && u.partner.status === "ACTIVE" && u.partner.type === "UNIVERSITY"),
    programs: u.programs,
  }));

  // Shared (CDN) cache, deliberately: the response content is identical for
  // every signed-in student (same catalog, nothing per-user), matching what
  // any authenticated student can already see on /universities — so a cache
  // hit skipping the auth re-check on repeat requests within the window is
  // an acceptable, intentional trade-off here, not an oversight.
  return Response.json(
    { universities: payload },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } },
  );
}
