import Link from "next/link";
import { ArrowRight, BedDouble, BriefcaseBusiness, ChefHat, Download, FileText, LifeBuoy, Mail, MessageCircle, Search, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StudyHeader } from "@/components/layout/StudyHeader";
import { ChatWithNoodlesFab } from "@/components/home/ChatWithNoodlesFab";
import { HomeHero } from "@/components/home/HomeHero";
import { PartnerLogo } from "@/components/partners/PartnerLogo";
import { knownPartnerWebsite } from "@/lib/partners/knownWebsites";
import { prisma } from "@/lib/prisma";
import { SupportLauncher } from "@/components/support/SupportLauncher";
import { SOUP_SUPPORT_EMAIL, supportWhatsAppUrl } from "@/lib/support/config";
import { networksFromMetadata } from "@/lib/universities/catalogChannels";
import { PREMIUM_COUNSELING_PRICE_USD, PREMIUM_COUNSELING_TITLE, PREMIUM_PLUS_PRICE_USD } from "@/lib/payments/config";
import { getCustomerDashboardData } from "@/lib/queries/dashboard";

const WORKFLOWS = [
  { href: "/universities", title: "Find a university", short: "Browse programs or get matched in minutes", icon: Search, bg: "#E9EEFB", fg: "#1F3FA8" },
  { href: "/services/accommodation", title: "Find a place to live", short: "Verified student housing near campus", icon: BedDouble, bg: "#FFF4CC", fg: "#8A6A00" },
  { href: "/services/finance", title: "Plan my money", short: "Costs, proof of funds and blocked accounts", icon: BriefcaseBusiness, bg: "#E3F2E5", fg: "#2E7D32" },
  { href: "/services/insurance", title: "Get insured", short: "Visa-ready health cover in minutes", icon: ShieldCheck, bg: "#F1E9FA", fg: "#6A3FA0" },
  { href: "/resume", title: "Write my CV & letter", short: "AI help for application-ready documents", icon: FileText, bg: "#FDE8DE", fg: "#B23C0B" },
];

const PICK_BAND_COLORS = ["#1F3FA8", "#0B6B50", "#6A3FA0", "#B23C0B"];

function firstNameOf(fullName: string) {
  return fullName.split(" ")[0] || fullName;
}

const CONFIRMED_SERVICE_PARTNERS = [
  { name: "LearnersDen.eu", type: "OTHER", role: "Counselling & Application Management", country: "International", websiteUrl: "https://learnersden.eu/" },
  { name: "AmberStudent", type: "ACCOMMODATION", role: "Accommodation Partner", country: "International", websiteUrl: "https://amberstudent.com/" },
  { name: "HousingAnywhere", type: "ACCOMMODATION", role: "Accommodation Partner", country: "Europe", websiteUrl: "https://housinganywhere.com/" },
] as const;

// The DB stores this as one partner row under a combined legal/trade name, but
// the two are separate real brands with their own websites/logos, so they are
// split into two displayed entries here rather than sharing one logo.
const HELLENIC_SUN_INSUREMART_SPLIT = [
  { suffix: "insuremart", name: "Insuremart", websiteUrl: "https://insuremart.pk/" },
  { suffix: "hellenic-sun", name: "Hellenic Sun Insurance Brokers", websiteUrl: "https://www.hellenicsun.pk/" },
] as const;

const FEATURED_EUROPE_UNIVERSITIES = [
  "KEDGE Business School",
  "ESDES Business School",
  "University of Debrecen",
  "International Business School Budapest",
  "University of Europe for Applied Sciences",
  "University of Greenwich",
  "Dublin Business School",
  "Hochschule Fresenius",
] as const;

// Shown only on the small homepage promo cards for confirmed direct-partner
// universities — a student-facing nudge toward applying through SOUP, not a
// specific discount figure (no such figure is tracked anywhere in the data).
const UNIVERSITY_PROMO_TAG = "Early bird via SOUP";

function logoUrl(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const url = String((value as Record<string, unknown>).logoUrl || "").trim();
  return /^https?:\/\//i.test(url) ? url : null;
}

function serviceRole(type: string, name: string) {
  if (/LearnersDen/i.test(name)) return "Counselling & Application Management";
  if (/MCB Islamic/i.test(name)) return "Banking Partner";
  if (type === "ACCOMMODATION") return "Accommodation Partner";
  if (type === "INSURANCE") return "Insurance Partner";
  if (type === "STUDENT_FINANCE") return "Student Finance Partner";
  if (type === "TRAVEL") return "Travel Partner";
  return "SOUP Partner";
}

function serviceHref(type: string, name: string) {
  if (/LearnersDen/i.test(name)) return "/applications";
  if (type === "ACCOMMODATION") return "/services/accommodation";
  if (type === "INSURANCE") return "/services/insurance";
  if (type === "STUDENT_FINANCE") return "/services/finance";
  return "/counselor";
}

const HOMEPAGE_UNIVERSITY_INCLUDE = { partner: true, programs: { where: { active: true }, select: { id: true } } } as const;

// SOUP's vocational pathway partnership: COTHM (College Of Tourism & Hotel
// Management) sends diploma graduates on; the hospitality/tourism programs
// below (tagged UniversityProgram.publicMetadata.networks: ["HOSPITALITY_PATHWAY"],
// see catalogChannels.ts for the matching University-level convention this
// mirrors one level down) are the Bachelor's/Master's top-ups SOUP has
// verified for that handoff. COTHM itself has no University/program rows of
// its own here — SOUP doesn't manage applications to it, only out of it — so
// its facts are a plain constant rather than a DB-backed partner.
const COTHM_PARTNER = {
  name: "COTHM",
  fullName: "College Of Tourism & Hotel Management",
  websiteUrl: "https://cothm.edu.pk/",
  description: "Pakistan's leading hospitality & culinary training network — 23+ campuses nationwide, training students in hospitality management, culinary arts and tourism since 2002.",
};

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const dashboardData = user ? await getCustomerDashboardData(user.id) : null;
  // The homepage only ever displays 8 universities. The previous version
  // fetched up to 240 rows (each with a nested partner + programs include)
  // just to pick 8 by name — measured as a real contributor to homepage
  // TTFB. This queries directly for the featured names first (a small,
  // index-friendly IN-list lookup), only falling back to a broader query
  // for the rare case fewer than 8 of the featured names exist yet.
  const [featuredMatches, dbServicePartners, governmentPartnerUniversities] = await Promise.all([
    prisma.university.findMany({
      where: { name: { in: [...FEATURED_EUROPE_UNIVERSITIES] }, partner: { type: "UNIVERSITY", status: "ACTIVE" } },
      include: HOMEPAGE_UNIVERSITY_INCLUDE,
    }).catch(() => []),
    prisma.partner.findMany({
      where: { status: "ACTIVE", type: { in: ["ACCOMMODATION", "INSURANCE", "STUDENT_FINANCE", "SCHOLARSHIP", "TRAVEL", "OTHER"] } },
      orderBy: [{ internalPriority: "asc" }, { name: "asc" }],
      take: 12,
    }).catch(() => []),
    // SOUP's first government partnership (Greece's public university
    // network) — queried separately from the generic featured-universities
    // list above because it has no Partner row (see catalogChannels.ts:
    // the GOVERNMENT channel is a publicMetadata.networks tag, not a
    // partnerId relationship), and because it deserves its own distinct,
    // clearly-labeled promotional placement rather than being folded
    // anonymously into the generic partner grid.
    prisma.university.findMany({
      where: { country: "Greece" },
      orderBy: { name: "asc" },
      include: { programs: { where: { active: true }, select: { id: true } } },
    }).catch(() => []),
  ]);
  const governmentPartners = governmentPartnerUniversities.filter((u) => networksFromMetadata(u.publicMetadata).includes("GOVERNMENT"));

  // Hospitality/tourism Bachelor's & Master's top-up programs curated for the
  // COTHM pathway. publicMetadata is per-program (not per-university, unlike
  // GOVERNMENT above) since a university can carry this tag on one program
  // while offering dozens of unrelated ones. Scoped to the four countries
  // these were actually sourced from (rather than every active program in
  // the whole catalogue) and filtered in JS, the same pattern governmentPartners
  // above uses — Prisma's JSON array_contains filtering is DB-version-finicky
  // enough that this codebase consistently avoids relying on it at the query level.
  const hospitalityProgramRows = await prisma.universityProgram.findMany({
    where: { active: true, university: { country: { in: ["Greece", "Portugal", "Germany", "Italy"] } } },
    include: { university: true },
    orderBy: [{ level: "asc" }],
  }).catch(() => []);
  const hospitalityPrograms = hospitalityProgramRows.filter((p) => networksFromMetadata(p.publicMetadata).includes("HOSPITALITY_PATHWAY"));

  const universityPartners: Array<(typeof featuredMatches)[number]> = [];
  for (const featuredName of FEATURED_EUROPE_UNIVERSITIES) {
    const match = featuredMatches.find((university) => university.name.toLowerCase() === featuredName.toLowerCase());
    if (match) universityPartners.push(match);
  }
  if (universityPartners.length < 8) {
    const fallback = await prisma.university.findMany({
      where: { partner: { type: "UNIVERSITY", status: "ACTIVE" }, id: { notIn: universityPartners.map((u) => u.id) } },
      orderBy: [{ country: "asc" }, { name: "asc" }],
      take: 8 - universityPartners.length,
      include: HOMEPAGE_UNIVERSITY_INCLUDE,
    }).catch(() => []);
    universityPartners.push(...fallback);
  }

  const mergedServices = dbServicePartners.flatMap((partner) => {
    const base = {
      type: partner.type,
      country: partner.country || "SOUP Partner",
      websiteUrl: partner.websiteUrl || knownPartnerWebsite(partner.name),
      logoUrl: logoUrl(partner.publicMetadata),
      role: serviceRole(partner.type, partner.name),
    };
    if (/Hellenic Sun/i.test(partner.name)) {
      return HELLENIC_SUN_INSUREMART_SPLIT.map((brand) => ({ id: `${partner.id}-${brand.suffix}`, ...base, name: brand.name, websiteUrl: brand.websiteUrl }));
    }
    return [{ id: partner.id, ...base, name: partner.name }];
  });
  for (const confirmed of CONFIRMED_SERVICE_PARTNERS) {
    if (mergedServices.some((partner) => partner.name.toLowerCase() === confirmed.name.toLowerCase())) continue;
    mergedServices.push({ id: `confirmed-${confirmed.name}`, ...confirmed, logoUrl: null });
  }

  return (
    <div className="min-h-screen w-full bg-paper">
      <StudyHeader current="home" signedIn={!!user} fullName={dashboardData?.profile.user.fullName}/>
      <SupportLauncher signedIn={!!user} />
      <main className="mx-auto w-full max-w-[1600px] px-5 pb-16 pt-6 sm:px-6 xl:px-10">
        <HomeHero
          signedIn={!!user}
          firstName={dashboardData ? firstNameOf(dashboardData.profile.user.fullName) : null}
          progress={dashboardData?.applicationProgress || null}
          nextTask={dashboardData?.studentActionItems[0] || null}
          journeyStage={dashboardData?.studentCase?.stage || null}
        />

        <section aria-labelledby="iwant" className="mt-7 flex flex-col gap-4">
          <h2 id="iwant" className="m-0 text-[22px] font-extrabold text-ink">I want to…</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
          {WORKFLOWS.map((wf) => {
            const Icon = wf.icon;
            const universityPromo = wf.href === "/universities"
              ? universityPartners.filter((university) => university.partner).slice(0, 2).map((university) => ({ id: university.id, name: university.name, country: university.country, websiteUrl: university.websiteUrl || university.partner?.websiteUrl || null, logoUrl: logoUrl(university.publicMetadata) || logoUrl(university.partner?.publicMetadata) }))
              : null;
            const partnerPreview = wf.href === "/services/accommodation"
              ? mergedServices.filter((partner) => partner.type === "ACCOMMODATION").slice(0, 2)
              : wf.href === "/services/insurance"
                ? mergedServices.filter((partner) => partner.type === "INSURANCE").slice(0, 2)
                : [];
            return (
              <Link key={wf.href} href={wf.href} className="flex min-h-[150px] flex-col gap-2.5 rounded-[20px] p-[22px] no-underline text-ink transition hover:-translate-y-0.5" style={{ background: wf.bg }}>
                <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-white"><Icon size={22} style={{ color: wf.fg }} /></span>
                <span className="text-lg font-extrabold">{wf.title}</span>
                <span className="text-sm leading-snug text-mute">{wf.short}</span>
                  {universityPromo && universityPromo.length > 0 && (
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      {universityPromo.map((university) => (
                        <div key={university.id} className="min-w-0 rounded-lg bg-white/70 p-2">
                          <div className="flex items-center gap-1.5"><PartnerLogo name={university.name} websiteUrl={university.websiteUrl} logoUrl={university.logoUrl} size={20}/><span className="truncate text-[10px] font-semibold text-ink">{university.name}</span></div>
                          <div className="mt-1 text-[9px] font-medium uppercase tracking-[.08em] text-teal">{university.country}</div>
                          <div className="mt-1 inline-flex items-center rounded-full bg-teal/10 px-1.5 py-0.5 text-[8px] font-semibold text-teal">{UNIVERSITY_PROMO_TAG}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {partnerPreview.length > 0 && <div className="mt-1 flex flex-wrap items-center gap-2">{partnerPreview.map((partner) => <div key={partner.id} className="flex min-w-0 items-center gap-1.5 rounded-full bg-white/70 py-1 pl-1 pr-2"><PartnerLogo name={partner.name} websiteUrl={partner.websiteUrl} logoUrl={partner.logoUrl} size={22}/><span className="max-w-[120px] truncate text-[9px] font-semibold text-ink">{partner.name}</span></div>)}</div>}
              </Link>
            );
          })}
          </div>
        </section>

        <section className="mt-14 overflow-hidden rounded-[28px] bg-navy">
          <div className="flex flex-col lg:flex-row">
            <div className="flex flex-1 flex-col gap-4 p-8 text-white sm:p-11">
              <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-[#FFF4CC] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.06em] text-[#6B5000]">
                <Download size={12} /> New · Free download
              </span>
              <h2 className="m-0 text-[26px] font-extrabold leading-tight tracking-tight sm:text-[28px]">Fill out applications without leaving the page</h2>
              <p className="m-0 max-w-[480px] text-sm leading-6 text-[#D3DAEA]">SOUP Companion is a desktop browser that scans real university, visa and accommodation forms, fills them from your SOUP profile, and flags anything that needs your attention — browse normally, UCAS and Common App included.</p>
              <div className="mt-1 flex flex-wrap gap-2.5">
                <Link href="/companion/connect" className="inline-flex h-[46px] items-center gap-2 rounded-[13px] bg-white px-5 text-sm font-bold text-navy no-underline"><Download size={16} /> Download for Windows</Link>
                <Link href="/companion/connect" className="inline-flex h-[46px] items-center rounded-[13px] border-[1.5px] border-white/30 px-5 text-sm font-bold text-white no-underline">See how it works</Link>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center bg-[#0E1830] p-7">
              <div className="w-full max-w-[420px] overflow-hidden rounded-xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
                <div className="flex items-center gap-1.5 bg-[#1A2B4D] px-2.5 py-2">
                  <span className="rounded-t-md bg-paper px-2.5 py-1 text-[9px] font-bold text-ink">UCAS — Apply</span>
                  <span className="rounded-t-md bg-white/10 px-2 py-1 text-[9px] font-semibold text-[#B9C4DB]">SOUP</span>
                </div>
                <div className="flex gap-1.5 bg-[#1A2B4D] px-2.5 pb-2 pt-1.5">
                  <span className="h-4 w-4 rounded-md bg-white/10" />
                  <span className="h-4 w-4 rounded-md bg-white/10" />
                  <span className="h-4 flex-1 rounded-lg bg-white" />
                </div>
                <div className="flex">
                  <div className="flex-1 space-y-2 p-3.5">
                    <span className="block h-[7px] w-3/5 rounded bg-hair" />
                    <span className="block h-5 w-11/12 rounded-md border border-[#C8E2D6] bg-[#F3F8F5]" />
                    <span className="mt-1 block h-[7px] w-2/5 rounded bg-hair" />
                    <span className="block h-5 w-11/12 rounded-md border border-[#C8E2D6] bg-[#F3F8F5]" />
                    <span className="mt-1 block h-[7px] w-1/2 rounded bg-hair" />
                    <span className="block h-5 w-11/12 rounded-md border border-[#F1C564] bg-[#FFFBEF]" />
                  </div>
                  <div className="flex w-[118px] shrink-0 flex-col gap-1.5 border-l border-hair bg-white p-2.5">
                    <span className="h-5 w-5 rounded-md bg-[#FFF4CC]" />
                    <span className="h-[34px] w-full rounded-lg bg-paper" />
                    <span className="h-11 w-full rounded-lg bg-[#FFF8E1]" />
                    <span className="mt-auto h-[22px] w-full rounded-lg bg-teal" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {governmentPartners.length > 0 && (
          <section className="mt-14 rounded-[28px] border border-[#C9D8E6] bg-gradient-to-br from-[#EAF0F5] to-white p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div className="max-w-2xl">
                <div className="text-xs font-semibold uppercase tracking-[.16em] text-navy">SOUP's first government partnership</div>
                <h2 className="mt-2 text-2xl font-semibold text-ink">Greece's public universities, now open through SOUP.</h2>
                <p className="mt-3 text-sm leading-6 text-mute">{governmentPartners.length} state-recognized Greek public universities with English-taught Bachelor's and Master's programmes, sourced directly from Greece's official Study in Greece network.</p>
              </div>
              <Link href="/universities?channel=GOVERNMENT" className="text-xs font-semibold text-navy">See all {governmentPartners.length} <ArrowRight size={12} className="ml-1 inline"/></Link>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {governmentPartners.slice(0, 8).map((university) => (
                <Link key={university.id} href={`/universities/${university.id}`} className="group rounded-xl border border-hair bg-white p-4 transition hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-sm">
                  <PartnerLogo name={university.name} websiteUrl={university.websiteUrl} logoUrl={logoUrl(university.publicMetadata)} size={34}/>
                  <div className="mt-2 truncate text-xs font-semibold text-ink">{university.name}</div>
                  <div className="mt-1 text-[10px] text-mute">{[university.city, "Greece"].filter(Boolean).join(", ")}</div>
                  <div className="mt-2 text-[9px] font-semibold uppercase tracking-[.1em] text-navy">{university.programs.length} program{university.programs.length === 1 ? "" : "s"}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {hospitalityPrograms.length > 0 && (
          <section className="mt-14 rounded-[28px] border border-[#E6D9C3] bg-gradient-to-br from-[#FBF4E8] to-white p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[.16em] text-[#8A6A1E]"><ChefHat size={13}/>Vocational pathway partnership</div>
                <h2 className="mt-2 text-2xl font-semibold text-ink">Finished your diploma at COTHM? Continue into a European degree.</h2>
                <p className="mt-3 text-sm leading-6 text-mute">SOUP now partners with <strong className="font-semibold text-ink">COTHM</strong> ({COTHM_PARTNER.fullName}) — {COTHM_PARTNER.description} Below are {hospitalityPrograms.length} verified English-taught hospitality, culinary and tourism Bachelor's and Master's top-ups at public universities, ready for diploma graduates.</p>
              </div>
              <Link href="/universities" className="text-xs font-semibold text-navy">Browse hospitality & culinary programs <ArrowRight size={12} className="ml-1 inline"/></Link>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {hospitalityPrograms.slice(0, 9).map((program) => (
                <Link key={program.id} href={`/universities/${program.university.id}`} className="group rounded-xl border border-hair bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#8A6A1E]/30 hover:shadow-sm">
                  <div className="flex items-start gap-3">
                    <PartnerLogo name={program.university.name} websiteUrl={program.university.websiteUrl} logoUrl={logoUrl(program.university.publicMetadata)} size={30}/>
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] font-semibold uppercase tracking-[.1em] text-[#8A6A1E]">{program.level} · {program.university.country}</div>
                      <div className="mt-1 truncate text-xs font-semibold text-ink">{program.title}</div>
                      <div className="mt-1 truncate text-[10px] text-mute">{program.university.name}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="picks" className="mt-10 flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="picks" className="m-0 text-[22px] font-extrabold text-ink">Picked for you</h2>
            <Link href="/universities" className="text-[15px] font-bold text-navy no-underline">See all universities</Link>
          </div>
          <p className="m-0 max-w-xl text-sm leading-6 text-mute">Strong European options from SOUP's direct and network access — including Hungary, France, Germany, Ireland and the UK. SOUP broadens beyond Europe whenever you ask for something different.</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
            {universityPartners.length ? universityPartners.slice(0, 5).map((university, index) => (
              <article key={university.id} className="flex flex-col overflow-hidden rounded-[20px] border border-hair bg-white">
                <div className="flex h-[120px] items-end p-3.5" style={{ background: PICK_BAND_COLORS[index % PICK_BAND_COLORS.length] }}>
                  <PartnerLogo name={university.name} websiteUrl={university.websiteUrl || university.partner?.websiteUrl} logoUrl={logoUrl(university.publicMetadata) || logoUrl(university.partner?.publicMetadata)} size={40}/>
                </div>
                <div className="flex flex-col gap-2 p-[18px]">
                  <span className="text-[13px] font-bold text-mute">{[university.city, university.country].filter(Boolean).join(" · ")}</span>
                  <span className="text-[17px] font-extrabold leading-snug text-ink">{university.name}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {university.partner && <span className="rounded-[7px] bg-[#E8F4EF] px-[9px] py-[5px] text-xs font-bold text-teal">{UNIVERSITY_PROMO_TAG}</span>}
                    <span className="rounded-[7px] bg-[#F1F2EE] px-[9px] py-[5px] text-xs font-semibold text-mute">{university.programs.length} program{university.programs.length === 1 ? "" : "s"}</span>
                  </div>
                  <Link href={`/universities/${university.id}`} className="mt-1.5 flex h-11 items-center justify-center rounded-xl border-[1.5px] border-navy text-center text-sm font-bold text-navy no-underline">View programs</Link>
                </div>
              </article>
            )) : <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-hair bg-white p-5 text-xs leading-5 text-mute">University partner catalog is connected through the SOUP database and appears here when seeded in this environment.</div>}
            <article className="flex min-h-[150px] flex-col justify-center gap-3 rounded-[20px] border border-dashed border-[#B9C0B4] bg-white p-[22px]">
              <span className="text-[17px] font-extrabold text-ink">Not sure yet?</span>
              <span className="text-sm leading-relaxed text-mute">Answer a few quick questions about your budget, grades and goals. Noodles will shortlist programs that fit.</span>
              <Link href="/counselor?prompt=Help%20me%20find%20universities%20that%20fit%20my%20budget%2C%20grades%20and%20goals" className="flex h-11 items-center justify-center rounded-xl bg-teal text-sm font-bold text-white no-underline">Ask Noodles</Link>
            </article>
          </div>
        </section>

        <section className="mt-14 rounded-[28px] border border-hair bg-white p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">Beyond admission</div><h2 className="mt-2 text-xl font-semibold text-ink">A connected partner ecosystem around the student.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-mute">Accommodation, insurance, banking and application management stay connected to the same student journey instead of becoming separate searches.</p></div><Link href="/dashboard" className="text-xs font-semibold text-navy">Open My SOUP <ArrowRight size={12} className="ml-1 inline"/></Link></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mergedServices.slice(0, 9).map((partner) => <Link key={partner.id} href={serviceHref(partner.type, partner.name)} className="group rounded-2xl border border-hair bg-paper/60 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"><div className="flex items-start gap-3"><PartnerLogo name={partner.name} websiteUrl={partner.websiteUrl} logoUrl={partner.logoUrl}/><div className="min-w-0 flex-1"><div className="text-[9px] font-semibold uppercase tracking-[.12em] text-teal">{partner.role}</div><div className="mt-1 text-xs font-semibold text-ink">{partner.name}</div><div className="mt-1 text-[10px] text-mute">{partner.country}</div></div><ArrowRight size={12} className="mt-1 text-mute transition group-hover:translate-x-0.5 group-hover:text-navy"/></div></Link>)}
          </div>
        </section>

        <section className="mt-14 rounded-[28px] border border-[#C9D8E6] bg-[#F7FAFC] p-6 sm:p-8">
          <div className="max-w-2xl"><div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">Choose your support</div><h2 className="mt-2 text-2xl font-semibold text-ink">Noodles for everyone. Human counseling when you want more.</h2><p className="mt-3 text-sm leading-6 text-mute">Start free, add real-time counselor support, or choose our high-touch SOUP Concierge service.</p></div>
          <div className="mt-6 grid gap-3 lg:grid-cols-3">
            {[{name:"Free",price:"€0",text:"Noodles, university discovery, public-university research, talking to the counselor agent and uploading your documents — exploring SOUP is free.",cta:"Start with Noodles"},{name:PREMIUM_COUNSELING_TITLE,price:`€${PREMIUM_COUNSELING_PRICE_USD}`,text:"Real-time human counselors plus managed support for eligible SOUP-network applications.",cta:`View ${PREMIUM_COUNSELING_TITLE}`},{name:"SOUP Concierge",price:`€${PREMIUM_PLUS_PRICE_USD}`,text:"Weekly video sessions, senior counselor oversight, private accommodation search and high-touch end-to-end case management.",cta:"View Concierge"}].map((plan)=><div key={plan.name} className="rounded-2xl border border-hair bg-white p-5"><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">{plan.name}</div><div className="mt-2 text-2xl font-semibold text-ink">{plan.price}</div><div className="mt-0.5 text-[10px] text-mute">EUR {plan.price!=="€0"?"· one-time":""}</div><p className="mt-3 text-xs leading-5 text-mute">{plan.text}</p><Link href={plan.name==="Free"?"/counselor":"/premium"} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-navy">{plan.cta} <ArrowRight size={12}/></Link></div>)}
          </div>
          <p className="mt-4 text-[11px] leading-5 text-mute">University application fees and other university/third-party charges are separate and are shown in My SOUP → Payments when recorded.</p>
        </section>


        <section className="mt-14 rounded-[28px] bg-navy p-6 text-white sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[.16em] text-white/55">Help when you need it</div>
              <h2 className="mt-2 text-2xl font-semibold">Talk to SOUP, not a help maze.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">Open an account-linked support request, email the admissions team, or continue directly on WhatsApp. Signed-in support requests also create an internal SOUP alert immediately.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
              <Link href={user ? "/support" : "/sign-in?next=/support"} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-semibold text-navy"><LifeBuoy size={14}/> {user ? "Open support" : "Sign in for support"}</Link>
              <a href={supportWhatsAppUrl()} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-xs font-semibold text-white"><MessageCircle size={14}/> WhatsApp</a>
              <a href={`mailto:${SOUP_SUPPORT_EMAIL}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-xs font-semibold text-white"><Mail size={14}/> {SOUP_SUPPORT_EMAIL}</a>
            </div>
          </div>
          <div className="mt-5 text-[11px] text-white/55">WhatsApp: +48 739 654 618</div>
        </section>

        {!user && <p className="mt-8 text-center text-xs text-mute">Start with Noodles as a guest. SOUP asks you to create an account when private documents, saved plans or managed applications are needed.</p>}
      </main>
      <ChatWithNoodlesFab/>
    </div>
  );
}
