import Link from "next/link";
import { ArrowRight, BedDouble, BriefcaseBusiness, FileText, LifeBuoy, Mail, MessageCircle, Search, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { HomeAIEntry } from "@/components/home/HomeAIEntry";
import { PartnerLogo } from "@/components/partners/PartnerLogo";
import { knownPartnerWebsite } from "@/lib/partners/knownWebsites";
import { prisma } from "@/lib/prisma";
import { SupportLauncher } from "@/components/support/SupportLauncher";
import { SOUP_SUPPORT_EMAIL, supportWhatsAppUrl } from "@/lib/support/config";

const WORKFLOWS = [
  { href: "/universities", title: "Universities & Programs", short: "Explore the network or ask SOUP to match you", icon: Search },
  { href: "/services/accommodation", title: "Accommodation", short: "See SOUP housing partners directly, then ask AI if you need help", icon: BedDouble },
  { href: "/services/insurance", title: "Student Insurance", short: "See the insurance partner directly, with AI guidance when needed", icon: ShieldCheck },
  { href: "/services/finance", title: "Student Finance", short: "See banking/finance partners directly, then plan proof of funds", icon: BriefcaseBusiness },
  { href: "/resume", title: "Resume & Cover Letter", short: "Build application-ready documents", icon: FileText },
];

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

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // The homepage only ever displays 8 universities. The previous version
  // fetched up to 240 rows (each with a nested partner + programs include)
  // just to pick 8 by name — measured as a real contributor to homepage
  // TTFB. This queries directly for the featured names first (a small,
  // index-friendly IN-list lookup), only falling back to a broader query
  // for the rare case fewer than 8 of the featured names exist yet.
  const [featuredMatches, dbServicePartners] = await Promise.all([
    prisma.university.findMany({
      where: { name: { in: [...FEATURED_EUROPE_UNIVERSITIES] }, partner: { type: "UNIVERSITY", status: "ACTIVE" } },
      include: HOMEPAGE_UNIVERSITY_INCLUDE,
    }).catch(() => []),
    prisma.partner.findMany({
      where: { status: "ACTIVE", type: { in: ["ACCOMMODATION", "INSURANCE", "STUDENT_FINANCE", "SCHOLARSHIP", "TRAVEL", "OTHER"] } },
      orderBy: [{ internalPriority: "asc" }, { name: "asc" }],
      take: 12,
    }).catch(() => []),
  ]);

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
      <Header signedIn={!!user} />
      <SupportLauncher signedIn={!!user} />
      <main className="mx-auto w-full max-w-5xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <section className="mx-auto max-w-3xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[.18em] text-teal">Students Online University Portal</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">How can SOUP help you today?</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-mute">One intelligent student journey from discovery to applications, documents, visa preparation and arrival.</p>
          <div className="mt-7 text-left"><HomeAIEntry/></div>
        </section>

        <section className="mx-auto mt-5 grid max-w-3xl grid-cols-1 gap-2.5 sm:grid-cols-2">
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
              <Link key={wf.href} href={wf.href} className="rounded-xl border border-hair bg-white px-4 py-3.5 flex min-h-[118px] items-start gap-3 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm">
                <div className="mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#EAF0F5]"><Icon size={14} className="text-navy" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold mb-0.5 text-ink">{wf.title}</div>
                  <div className="text-xs leading-snug text-mute">{wf.short}</div>
                  {universityPromo && universityPromo.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {universityPromo.map((university) => (
                        <div key={university.id} className="min-w-0 rounded-lg border border-[#D9E7E3] bg-[#F4FAF8] p-2">
                          <div className="flex items-center gap-1.5"><PartnerLogo name={university.name} websiteUrl={university.websiteUrl} logoUrl={university.logoUrl} size={20}/><span className="truncate text-[10px] font-semibold text-ink">{university.name}</span></div>
                          <div className="mt-1 text-[9px] font-medium uppercase tracking-[.08em] text-teal">{university.country}</div>
                          <div className="mt-1 inline-flex items-center rounded-full bg-teal/10 px-1.5 py-0.5 text-[8px] font-semibold text-teal">{UNIVERSITY_PROMO_TAG}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {partnerPreview.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2">{partnerPreview.map((partner) => <div key={partner.id} className="flex min-w-0 items-center gap-1.5 rounded-full border border-hair bg-paper/70 py-1 pl-1 pr-2"><PartnerLogo name={partner.name} websiteUrl={partner.websiteUrl} logoUrl={partner.logoUrl} size={22}/><span className="max-w-[120px] truncate text-[9px] font-semibold text-ink">{partner.name}</span></div>)}</div>}
                </div>
              </Link>
            );
          })}
        </section>

        <section className="mt-16 border-t border-hair pt-12">
          <div className="grid gap-9 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">University network</div>
              <h2 className="mt-2 text-2xl font-semibold text-ink">Explore Europe first, then let SOUP guide the fit.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-mute">The homepage leads with strong European options from SOUP’s direct and network access — including Hungary, France, Germany, Ireland and the UK. SOUP still considers suitability first and broadens beyond Europe whenever the student asks for something different.</p>
              <Link href="/universities" className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-navy">Explore universities <ArrowRight size={13}/></Link>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {universityPartners.length ? universityPartners.map((university) => (
                <Link key={university.id} href={`/universities/${university.id}`} className="group rounded-xl border border-hair bg-white p-4 transition hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-sm">
                  <div className="flex items-start gap-3"><PartnerLogo name={university.name} websiteUrl={university.websiteUrl || university.partner?.websiteUrl} logoUrl={logoUrl(university.publicMetadata) || logoUrl(university.partner?.publicMetadata)}/><div className="min-w-0 flex-1"><div className="text-xs font-semibold text-ink">{university.name}</div><div className="mt-1 text-[11px] text-mute">{[university.city, university.country].filter(Boolean).join(", ")}</div><div className="mt-2 text-[9px] font-semibold uppercase tracking-[.12em] text-teal">{university.programs.length} program{university.programs.length === 1 ? "" : "s"}</div></div><ArrowRight size={13} className="mt-1 text-mute transition group-hover:translate-x-0.5 group-hover:text-navy"/></div>
                </Link>
              )) : <div className="sm:col-span-2 rounded-xl border border-hair bg-white p-5 text-xs leading-5 text-mute">University partner catalog is connected through the SOUP database and appears here when seeded in this environment.</div>}
            </div>
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
            {[{name:"Free",price:"$0",text:"Noodles, university discovery, public-university research and journey tracking.",cta:"Start with Noodles"},{name:"SOUP Plus",price:"$54",text:"Real-time human counselors plus managed support for eligible SOUP-network applications.",cta:"View SOUP Plus"},{name:"SOUP Concierge",price:"$500",text:"Weekly video sessions, senior counselor oversight, private accommodation search and high-touch end-to-end case management.",cta:"View Concierge"}].map((plan)=><div key={plan.name} className="rounded-2xl border border-hair bg-white p-5"><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">{plan.name}</div><div className="mt-2 text-2xl font-semibold text-ink">{plan.price}</div><div className="mt-0.5 text-[10px] text-mute">USD {plan.price!=="$0"?"· one-time":""}</div><p className="mt-3 text-xs leading-5 text-mute">{plan.text}</p><Link href={plan.name==="Free"?"/counselor":"/premium"} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-navy">{plan.cta} <ArrowRight size={12}/></Link></div>)}
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
    </div>
  );
}
