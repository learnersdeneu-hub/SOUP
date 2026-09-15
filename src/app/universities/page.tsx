import { Header } from "@/components/Header";
import { HomeAIEntry } from "@/components/home/HomeAIEntry";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { normalizeField, summarizeUniversityPrograms } from "@/lib/universities/presentation";
import { deriveCatalogChannel, networksFromMetadata } from "@/lib/universities/catalogChannels";
import { UniversityCatalogBrowser, type CatalogUniversity } from "@/components/universities/UniversityCatalogBrowser";

function metadataLogo(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const url = String((value as Record<string, unknown>).logoUrl || "").trim();
  return /^https?:\/\//i.test(url) ? url : null;
}

export default async function UniversitiesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Only a light, bounded per-university payload is fetched even though the
  // full catalogue (300+) renders "as one list" to the student: no internal
  // database id fields beyond this university's own id are exposed (see the
  // AI-context leak fix elsewhere), and each university's program list is
  // capped rather than joining every program row for every institution.
  const universityCatalog = await prisma.university.findMany({
    orderBy: [{ country: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      country: true,
      city: true,
      websiteUrl: true,
      publicMetadata: true,
      partnerId: true,
      programs: {
        where: { active: true },
        select: { level: true, field: true, intake: true, language: true, tuitionAmount: true, tuitionCurrency: true },
        take: 8,
      },
    },
  }).catch(() => []);

  const universities: CatalogUniversity[] = universityCatalog.map((university) => {
    const summary = summarizeUniversityPrograms(university.programs);
    const networks = networksFromMetadata(university.publicMetadata);
    const fields = [...new Set(university.programs.map((program) => normalizeField(program.field)).filter((value): value is string => Boolean(value)))];
    const languages = [...new Set(university.programs.map((program) => String(program.language || "").trim()).filter(Boolean))].slice(0, 4);
    return {
      id: university.id,
      name: university.name,
      country: university.country,
      city: university.city,
      websiteUrl: university.websiteUrl,
      logoUrl: metadataLogo(university.publicMetadata),
      channel: deriveCatalogChannel(networks, Boolean(university.partnerId)),
      programCount: summary.programCount,
      feeRange: summary.feeRange,
      intakes: summary.intakes,
      levels: summary.levels,
      fields,
      languages,
    };
  });

  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn={!!user}/>
      <main className="mx-auto w-full max-w-6xl px-4 pb-14 pt-8 sm:px-8 sm:pt-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">SOUP university network</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Explore universities and programs.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-mute">Search or filter the full SOUP catalogue. Click any university to continue straight into Noodles, who already knows which one you picked and can help you check fit and start an application.</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0">
            <UniversityCatalogBrowser universities={universities} />
          </div>
          <div className="lg:sticky lg:top-8 lg:self-start">
            <HomeAIEntry compact/>
          </div>
        </div>
      </main>
    </div>
  );
}
