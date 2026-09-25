import { Header } from "@/components/Header";
import { HomeAIEntry } from "@/components/home/HomeAIEntry";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { normalizeField, summarizeUniversityPrograms } from "@/lib/universities/presentation";
import { deriveCatalogChannel, networksFromMetadata } from "@/lib/universities/catalogChannels";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PartnerLogo } from "@/components/partners/PartnerLogo";
import { UniversityCatalogBrowser, type CatalogUniversity } from "@/components/universities/UniversityCatalogBrowser";
import { MY_COLLEGES_CAP } from "@/lib/applications/lifecycle";
import type { CatalogChannel } from "@/lib/universities/catalogChannels";

function metadataLogo(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const url = String((value as Record<string, unknown>).logoUrl || "").trim();
  return /^https?:\/\//i.test(url) ? url : null;
}

export default async function UniversitiesPage({ searchParams }: { searchParams: { channel?: string } }) {
  const current = await getCurrentUser();
  const user = current?.authUser || null;
  const initialChannel = searchParams.channel && ["GOVERNMENT", "DIRECT_SOUP", "AHZ", "GRANDLINK", "SOUP_CATALOGUE"].includes(searchParams.channel)
    ? (searchParams.channel as CatalogChannel)
    : undefined;

  // Only a light, bounded per-university payload is fetched even though the
  // full catalogue (300+) renders "as one list" to the student: each
  // university's program list is capped rather than joining every program
  // row for every institution. Program id/title are included specifically
  // so the "Add to My Colleges" button can let a student pick which program
  // to apply for — a different, legitimate use from the AI-context id leak
  // fixed elsewhere (that was about ids echoing back in a Noodles reply,
  // not about a client needing to reference a program it's choosing).
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
        select: { id: true, title: true, level: true, field: true, intake: true, language: true, tuitionAmount: true, tuitionCurrency: true },
        take: 8,
      },
    },
  }).catch(() => []);

  // Fetched once here, not per card: every active SOUP-managed application
  // this student already has, keyed by university, plus whether they're at
  // the My Colleges cap. AddToMyCollegesButton reads this from props instead
  // of each of 300+ cards independently checking its own selection state.
  const myApplications = current?.user.profile
    ? await prisma.studentApplication.findMany({
        where: { profileId: current.user.profile.id, ownership: "SOUP_MANAGED", status: { notIn: ["WITHDRAWN", "REJECTED"] } },
        select: { id: true, universityId: true, programId: true },
      })
    : [];
  const mySelectionsByUniversity = new Map(myApplications.filter((a) => a.universityId).map((a) => [a.universityId as string, { id: a.id, programId: a.programId }]));
  const capReached = myApplications.length >= MY_COLLEGES_CAP;

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
      programs: university.programs.map((p) => ({ id: p.id, title: p.title, level: p.level, intake: p.intake })),
      mySelection: mySelectionsByUniversity.get(university.id) || null,
    };
  });

  const governmentPartners = universities.filter((u) => u.channel === "GOVERNMENT");

  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn={!!user}/>
      <main className="mx-auto w-full max-w-6xl px-4 pb-14 pt-8 sm:px-8 sm:pt-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">SOUP university network</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Explore universities and programs.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-mute">Search or filter the full SOUP catalogue. Click any university to see its fees, intakes and programs, then continue into Noodles when you're ready — it already knows which one you picked and can help you check fit and start an application.</p>
          </div>
        </div>

        {governmentPartners.length > 0 && (
          <section className="mt-6 rounded-2xl border border-[#C9D8E6] bg-gradient-to-br from-[#EAF0F5] to-white p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-navy">SOUP's first government partnership</div>
                <h2 className="mt-1 text-lg font-semibold text-ink">{governmentPartners.length} Greek public universities, now open through SOUP</h2>
              </div>
            </div>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              {governmentPartners.slice(0, 12).map((university) => (
                <Link key={university.id} href={`/universities/${university.id}`} className="group rounded-xl border border-hair bg-white p-3 transition hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-sm">
                  <PartnerLogo name={university.name} websiteUrl={university.websiteUrl} logoUrl={university.logoUrl} size={28}/>
                  <div className="mt-2 truncate text-[11px] font-semibold text-ink">{university.name}</div>
                  <div className="mt-0.5 text-[9px] text-mute">{university.city || "Greece"}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0">
            <UniversityCatalogBrowser universities={universities} signedIn={!!user} capReached={capReached} initialChannel={initialChannel} />
          </div>
          <div className="lg:sticky lg:top-8 lg:self-start">
            <HomeAIEntry compact/>
          </div>
        </div>
      </main>
    </div>
  );
}
