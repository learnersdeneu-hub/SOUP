import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight, BedDouble, BriefcaseBusiness, Check, ClipboardCheck, Compass, FileText, FolderLock, GraduationCap,
  Landmark, Mail, MessageCircle, Plane, Scale, Search, ShieldCheck, Sparkles, UtensilsCrossed,
} from "lucide-react";
import { PartnerLogo } from "@/components/partners/PartnerLogo";
import { NoodlesLoader } from "@/components/ui/NoodlesLoader";
import { BrandLogo } from "@/components/BrandLogo";
import { TourVideo } from "@/components/landing/TourVideo";
import { JOURNAL_ARTICLES, type JournalArticle } from "@/lib/landing/journal";
import {
  LANDING_FAQ, LANDING_INSURANCE_PARTNERS, LANDING_LIVING_PARTNERS, LANDING_MORE_PARTNERS, LANDING_PERSONAS, LANDING_UNIVERSITIES, LANDING_USES,
} from "@/lib/landing/content";
import { knownPartnerWebsite } from "@/lib/partners/knownWebsites";
import { SOUP_SUPPORT_EMAIL } from "@/lib/support/config";
import { PREMIUM_COUNSELING_PRICE_USD, PREMIUM_COUNSELING_TITLE, PREMIUM_PLUS_PRICE_USD, PREMIUM_PLUS_TITLE } from "@/lib/payments/config";
import type { Guide } from "@/lib/guides/content";

function SectionHead({ eyebrow, title, sub, center = false }: { eyebrow: string; title: ReactNode; sub?: ReactNode; center?: boolean }) {
  return (
    <div className={`flex flex-col gap-3 ${center ? "items-center text-center" : ""}`}>
      <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-teal">{eyebrow}</span>
      <h2 className="m-0 max-w-[760px] text-[32px] font-extrabold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[44px]">{title}</h2>
      {sub && <p className="m-0 max-w-[620px] text-base leading-relaxed text-mute sm:text-[17px]">{sub}</p>}
    </div>
  );
}

const shell = "mx-auto w-full max-w-[1280px] px-5 sm:px-8";

/* ---------------------------------------------------------------- video */

export function VideoSection() {
  return (
    <section id="video" className="scroll-mt-20 py-16 sm:py-24">
      <div className={shell}>
        <SectionHead center eyebrow="SOUP in 15 seconds" title={<>This is what SOUP looks like.</>} sub="One portal for the whole study-abroad journey — from the first search to the day you land." />
        <div className="mx-auto mt-12 max-w-[1080px]"><TourVideo /></div>

        <div className="mx-auto mt-16 grid max-w-[1080px] gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-hair bg-white p-7 sm:p-8">
            <h3 className="m-0 text-xl font-extrabold text-ink">Who it&apos;s for</h3>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {LANDING_PERSONAS.map((persona) => (
                <div key={persona.title} className="rounded-2xl bg-paper p-4">
                  <div className="text-2xl">{persona.emoji}</div>
                  <div className="mt-2 text-[15px] font-extrabold text-ink">{persona.title}</div>
                  <div className="mt-1 text-[13px] leading-snug text-mute">{persona.line}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[28px] bg-ink p-7 text-white sm:p-8">
            <h3 className="m-0 text-xl font-extrabold">What you use it for</h3>
            <ul className="m-0 mt-5 grid list-none gap-3 p-0 sm:grid-cols-2">
              {LANDING_USES.map((use) => (
                <li key={use.title} className="flex gap-3 rounded-2xl bg-white/[0.06] p-4">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5DBB46] text-ink"><Check size={12} strokeWidth={3.5} /></span>
                  <span>
                    <span className="block text-[15px] font-extrabold">{use.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-white/70">{use.line}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------ inside the portal */

function MockWindow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div aria-hidden className="overflow-hidden rounded-2xl border border-hair bg-white shadow-[0_24px_50px_-28px_rgba(20,33,61,.45)]">
      <div className="flex h-8 items-center gap-1.5 bg-[#F1F3EE] px-3">
        <i className="h-2.5 w-2.5 rounded-full bg-[#DADFD5]" /><i className="h-2.5 w-2.5 rounded-full bg-[#DADFD5]" /><i className="h-2.5 w-2.5 rounded-full bg-[#DADFD5]" />
        <span className="ml-2 rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-mute">{label}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StepCard({ n, title, line, tint, children, className = "" }: { n: string; title: string; line: string; tint: string; children: ReactNode; className?: string }) {
  return (
    <article className={`flex flex-col gap-6 rounded-[28px] p-6 sm:p-8 ${className}`} style={{ background: tint }}>
      <div>
        <span className="inline-flex h-8 items-center rounded-full bg-white/80 px-3 text-xs font-extrabold text-ink">Step {n}</span>
        <h3 className="m-0 mt-4 text-[24px] font-extrabold leading-tight tracking-[-0.02em] text-ink">{title}</h3>
        <p className="m-0 mt-2 max-w-[440px] text-[15px] leading-relaxed text-mute">{line}</p>
      </div>
      <div className="mt-auto">{children}</div>
    </article>
  );
}

export function InsideSoupSection({ signUpHref }: { signUpHref: string }) {
  return (
    <section id="inside" className="scroll-mt-20 py-16 sm:py-24">
      <div className={shell}>
        <SectionHead eyebrow="Inside SOUP" title="How it works — four steps from 'where do I start?' to 'see you there'." sub="A peek at the real screens you'll use once you're in." />
        <div className="mt-12 grid gap-5 lg:grid-cols-12">
          <StepCard n="1" title="Request access" line="Tell us who you are and where you'd like to study. Once you're approved, you'll get a sign-in link by email." tint="#E9EEFB" className="lg:col-span-5">
            <MockWindow label="soup · request access">
              <div className="space-y-2">
                {["Full name", "Email", "Where do you want to study?"].map((field) => (
                  <div key={field} className="rounded-lg border border-hair px-3 py-2 text-xs text-mute">{field}</div>
                ))}
                <div className="flex items-center justify-between pt-1">
                  <span className="rounded-lg bg-ink px-3 py-2 text-xs font-bold text-white">Request access</span>
                  <span className="flex items-center gap-1 rounded-full bg-[#E3F2E5] px-2.5 py-1 text-[11px] font-extrabold text-teal"><Check size={12} strokeWidth={3} />Approved</span>
                </div>
              </div>
            </MockWindow>
          </StepCard>

          <StepCard n="2" title="Tell Noodles your goals" line="Noodles, your AI counselor, matches you to programs that fit your grades, budget and plans — and answers every 'quick question' along the way." tint="#FFF4CC" className="lg:col-span-7">
            <MockWindow label="soup · counselor">
              <div className="flex flex-col gap-3">
                <div className="self-end rounded-2xl rounded-br-sm bg-ink px-3.5 py-2 text-[13px] font-semibold text-white">I want a business master&apos;s in Europe under €10k a year.</div>
                <div className="flex items-start gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFF4CC] text-[#8A6A00]"><NoodlesLoader size={16} active={false} /></span>
                  <div className="rounded-2xl rounded-tl-sm bg-[#F1F3EE] px-3.5 py-2 text-[13px] leading-snug text-ink">Great goal! Here are programs in Hungary, France and Germany that fit. SOUP partners are marked so you can apply in one click.</div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {["Match me to universities", "What documents do I need?", "How much will it cost?", "Visa help"].map((prompt) => (
                    <span key={prompt} className="rounded-full border border-hair px-2.5 py-1 text-[11px] font-bold text-mute">{prompt}</span>
                  ))}
                </div>
              </div>
            </MockWindow>
          </StepCard>

          <StepCard n="3" title="Apply & track everything" line="Apply to SOUP partner universities directly, upload documents once to your secure vault, and follow every application from submitted to offer." tint="#E3F2E5" className="lg:col-span-7">
            <MockWindow label="soup · applications">
              <div className="flex items-center gap-1.5">
                {["Discover", "Apply", "Documents", "Visa & funds", "Arrive"].map((step, index) => (
                  <div key={step} className="flex flex-1 flex-col gap-1.5">
                    <div className={`h-1.5 rounded-full ${index < 3 ? "bg-teal" : "bg-[#E4E7E1]"}`} />
                    <span className={`text-[10px] font-bold ${index < 3 ? "text-teal" : "text-mute"}`}>{step}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-2">
                {[
                  ["University of Debrecen", "Offer received", "bg-[#FDE8DE] text-[#B23C0B]"],
                  ["KEDGE Business School", "Under review", "bg-[#E9EEFB] text-[#1F3FA8]"],
                  ["Hochschule Fresenius", "Submitted", "bg-[#F1F3EE] text-mute"],
                ].map(([name, status, cls]) => (
                  <div key={name} className="flex items-center justify-between rounded-xl border border-hair px-3 py-2">
                    <span className="flex items-center gap-2 text-[13px] font-bold text-ink"><GraduationCap size={14} className="text-mute" />{name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${cls}`}>{status}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 rounded-xl bg-paper px-3 py-2 text-[12px] font-semibold text-mute"><FolderLock size={14} className="text-teal" />Passport, transcripts &amp; 4 more — stored securely</div>
              </div>
            </MockWindow>
          </StepCard>

          <StepCard n="4" title="Get set to fly" line="Visa checklists, a place to live, insurance, money and your CV — all handled with trusted partners." tint="#F1E9FA" className="lg:col-span-5">
            <div aria-hidden className="grid grid-cols-2 gap-3">
              {[
                [BedDouble, "Find a place to live", "#FFF4CC", "#8A6A00"],
                [ShieldCheck, "Get insured", "#FFFFFF", "#6A3FA0"],
                [BriefcaseBusiness, "Plan my money", "#E3F2E5", "#2E7D32"],
                [FileText, "Write my CV & letter", "#FDE8DE", "#B23C0B"],
              ].map(([Icon, label, bg, fg]) => {
                const I = Icon as typeof BedDouble;
                return (
                  <div key={label as string} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-[0_14px_30px_-20px_rgba(20,33,61,.4)]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: bg as string, color: fg as string }}><I size={18} /></span>
                    <span className="text-[13px] font-extrabold text-ink">{label as string}</span>
                  </div>
                );
              })}
            </div>
          </StepCard>
        </div>
        <div className="mt-8 flex justify-center">
          <Link href={signUpHref} className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-bold text-white no-underline transition hover:-translate-y-px">Start with step 1 <ArrowRight size={16} /></Link>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- about */

const PRINCIPLES = [
  { icon: Scale, title: "Honest recommendations", line: "Partners are shown first only when they genuinely fit you. Independent options are always there, and we never show made-up 'match percentages'." },
  { icon: Landmark, title: "Current, official information", line: "Visa and document checklists are grounded in current official sources — not last year's forum posts." },
  { icon: Compass, title: "One journey, one place", line: "Your chats, documents, applications and plans are saved together, so you never start from scratch." },
] as const;

export function AboutSection() {
  return (
    <section id="about" className="scroll-mt-20 py-16 sm:py-24">
      <div className={`${shell} grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:items-center`}>
        <div>
          <SectionHead eyebrow="About us" title={<>We&apos;re building the study-abroad help we wish we&apos;d had.</>} />
          <div className="mt-6 space-y-4 text-[16px] leading-relaxed text-mute">
            <p className="m-0">Going abroad to study is one of the biggest decisions you&apos;ll make — and it usually means juggling a dozen websites, agents, spreadsheets and WhatsApp groups. <b className="text-ink">SOUP — the Students Online University Portal — puts all of it in one place.</b></p>
            <p className="m-0">We combine an AI counselor that&apos;s available any time with real counsellors and trusted partners: universities across Europe and beyond, verified student housing, visa-ready insurance and student banking. You stay in control of every choice; we make sure you never miss a step.</p>
            <p className="m-0">SOUP was founded by <b className="text-ink">Balaj Amjad</b>, who started the Learners Den counselling practice in 2020, with co-founder <b className="text-ink">Rameen Ahmad</b>, and is led by CEO <b className="text-ink">Agha Shahbaz Haider</b>. <Link href="/about" className="font-bold text-teal">Meet the team and read our story →</Link></p>
          </div>
          <div className="mt-7 inline-flex items-center gap-3 rounded-2xl border border-hair bg-white px-4 py-3">
            <PartnerLogo name="LearnersDen.eu" websiteUrl="https://learnersden.eu/" size={34} />
            <span className="text-sm text-mute">Counselling &amp; application management with <b className="text-ink">LearnersDen.eu</b></span>
          </div>
        </div>
        <div className="grid gap-4">
          {PRINCIPLES.map(({ icon: Icon, title, line }, index) => (
            <div key={title} className="flex gap-4 rounded-[24px] border border-hair bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-30px_rgba(20,33,61,.4)]">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: ["#1F3FA8", "#0B6B50", "#B23C0B"][index] }}><Icon size={22} /></span>
              <div>
                <h3 className="m-0 text-[17px] font-extrabold text-ink">{title}</h3>
                <p className="m-0 mt-1.5 text-[14px] leading-relaxed text-mute">{line}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- partners */

export function PartnersSection() {
  const marquee = [...LANDING_UNIVERSITIES, ...LANDING_UNIVERSITIES];
  return (
    <section id="partners" className="scroll-mt-20 py-16 sm:py-24">
      <div className={shell}>
        <SectionHead center eyebrow="Our partners" title="Universities, homes and help you can trust." sub="SOUP works directly with universities, housing platforms, insurers and banks — so the next step is always one click away." />
      </div>

      <div className="relative mt-12 overflow-hidden py-2 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
        <div className="landing-marquee flex w-max gap-4">
          {marquee.map((university, index) => (
            <div key={`${university.name}-${index}`} className="flex w-[300px] shrink-0 items-center gap-3 rounded-2xl border border-hair bg-white px-4 py-3.5">
              <PartnerLogo name={university.name} websiteUrl={knownPartnerWebsite(university.name)} size={42} />
              <div className="min-w-0">
                <div className="truncate text-[14px] font-extrabold text-ink">{university.name}</div>
                <div className="text-xs text-mute">{university.country} · SOUP partner</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`${shell} mt-8 grid gap-5 md:grid-cols-2`}>
        <div className="relative overflow-hidden rounded-[28px] bg-[#1F3FA8] p-7 text-white sm:p-8">
          <div aria-hidden className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold"><Landmark size={13} />Government partner network</span>
          <h3 className="m-0 mt-4 text-[24px] font-extrabold leading-tight">Greece&apos;s public universities</h3>
          <p className="m-0 mt-2 max-w-[420px] text-[15px] leading-relaxed text-white/80">SOUP&apos;s first government partnership opens English-taught programs at Greek public universities — strong degrees at public-university prices.</p>
        </div>
        <div className="relative overflow-hidden rounded-[28px] bg-[#B23C0B] p-7 text-white sm:p-8">
          <div aria-hidden className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold"><UtensilsCrossed size={13} />Hospitality pathway</span>
          <h3 className="m-0 mt-4 text-[24px] font-extrabold leading-tight">COTHM diploma → European degree</h3>
          <p className="m-0 mt-2 max-w-[420px] text-[15px] leading-relaxed text-white/80">Hospitality and tourism graduates of COTHM can top up into verified Bachelor&apos;s and Master&apos;s programs in Greece, Portugal, Germany and Italy.</p>
        </div>
      </div>

      <div className={`${shell} mt-5 grid gap-5 lg:grid-cols-[1fr_1.4fr]`}>
        <div className="rounded-[28px] bg-[#FFF4CC] p-7 sm:p-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#8A6A00]"><BedDouble size={22} /></span>
          <h3 className="m-0 mt-4 text-[24px] font-extrabold leading-tight text-ink">University living, sorted before you land</h3>
          <p className="m-0 mt-2 text-[15px] leading-relaxed text-[#4A3A00]">Search verified student rooms near the campus you&apos;ve applied to — residences, shared flats and studios, with secure booking.</p>
          <div className="mt-5 space-y-3">
            {LANDING_LIVING_PARTNERS.map((partner) => (
              <div key={partner.name} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
                <PartnerLogo name={partner.name} websiteUrl={partner.websiteUrl} size={38} />
                <div><div className="text-[14px] font-extrabold text-ink">{partner.name}</div><div className="text-xs text-mute">{partner.line}</div></div>
              </div>
            ))}
          </div>
        </div>
        <InsuranceCard />
      </div>

      <div className={`${shell} mt-8 flex flex-wrap items-center justify-center gap-3`}>
        <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-mute">Also with</span>
        {LANDING_MORE_PARTNERS.map((partner) => (
          <span key={partner.name} className="flex items-center gap-2 rounded-full border border-hair bg-white py-1.5 pl-1.5 pr-4">
            <PartnerLogo name={partner.name} websiteUrl={partner.websiteUrl} size={28} />
            <span className="text-[13px] font-bold text-ink">{partner.name}</span>
            <span className="hidden text-xs text-mute sm:inline">· {partner.role}</span>
          </span>
        ))}
      </div>
    </section>
  );
}

const INSURANCE_STEPS = [
  { icon: Plane, title: "Add your trip", line: "Destination, visa type and dates — saved from your SOUP profile." },
  { icon: Search, title: "Compare plans", line: "Visa-ready student and travel cover, side by side." },
  { icon: ClipboardCheck, title: "Partner review", line: "insuremart checks your details before the policy is issued." },
  { icon: FolderLock, title: "Ready for your visa", line: "Keep your certificate with your visa documents in SOUP." },
] as const;

function InsuranceCard() {
  return (
    <div id="insurance" className="relative scroll-mt-24 overflow-hidden rounded-[28px] bg-[#2A1650] p-7 text-white sm:p-8">
      <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#A57BDB]/40 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold"><ShieldCheck size={13} />Student insurance</span>
          {LANDING_INSURANCE_PARTNERS.map((partner) => (
            <span key={partner.name} className="flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-3 text-xs font-bold text-ink">
              <PartnerLogo name={partner.name} websiteUrl={partner.websiteUrl} size={22} />{partner.name}
            </span>
          ))}
        </div>
        <h3 className="m-0 mt-4 text-[26px] font-extrabold leading-tight sm:text-[30px]">Get your student insurance with insuremart — in minutes.</h3>
        <p className="m-0 mt-2 max-w-[560px] text-[15px] leading-relaxed text-white/75">Visa officers are strict about cover amounts and dates. Insurance through SOUP is arranged by insuremart and Hellenic Sun Insurance Brokers, so the policy you get is the one your visa needs.</p>
        <ol className="m-0 mt-6 grid list-none gap-3 p-0 sm:grid-cols-2">
          {INSURANCE_STEPS.map(({ icon: Icon, title, line }, index) => (
            <li key={title} className="flex gap-3 rounded-2xl bg-white/[0.08] p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15"><Icon size={17} /></span>
              <span>
                <span className="block text-[14px] font-extrabold">{index + 1}. {title}</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-white/70">{line}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- packages */

// Prices and names come from the same config the Stripe checkout uses, so the
// landing page can never advertise a different price from the one charged.
// Shown in USD, matching /premium and the Stripe charge.
const PACKAGES = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    note: "Included with every approved account",
    line: "Noodles, your AI counselor, helps you discover, compare and organise your university journey.",
    features: ["Noodles AI guidance, any time", "University & program discovery", "Public and government university research", "Deadlines and applications tracked in one place"],
    cta: "Request access",
    tone: "plain",
  },
  {
    key: "scholar",
    name: PREMIUM_COUNSELING_TITLE,
    price: `$${PREMIUM_COUNSELING_PRICE_USD}`,
    note: "One-time payment",
    line: "Add real human counsellors around Noodles, plus managed support for eligible partner applications.",
    features: ["Everything in Free", "Document uploads & application submission", "Real-time human counselor access", "Managed eligible partner-university applications", "Priority document & deadline follow-up", "Offer, visa & pre-departure planning"],
    cta: `Start with ${PREMIUM_COUNSELING_TITLE}`,
    tone: "featured",
  },
  {
    key: "concierge",
    name: PREMIUM_PLUS_TITLE,
    price: `$${PREMIUM_PLUS_PRICE_USD}`,
    note: "One-time payment",
    line: "Our high-touch service: a senior counselor runs your whole application journey with you.",
    features: ["Everything in Scholar", "Weekly scheduled video sessions", "Senior counselor case oversight", "Private accommodation search support", "University-representative sessions, when available", "End-to-end case management"],
    cta: `Choose ${PREMIUM_PLUS_TITLE}`,
    tone: "dark",
  },
] as const;

export function PackagesSection({ signUpHref }: { signUpHref: string }) {
  return (
    <section id="packages" className="scroll-mt-20 py-16 sm:py-24">
      <div className={shell}>
        <SectionHead center eyebrow="Packages" title="Start free. Add people when you want them." sub="Every student gets Noodles for free. Upgrade once — no subscriptions — when you'd like a real counsellor in your corner." />
        <div className="mx-auto mt-12 grid max-w-[1180px] gap-5 lg:grid-cols-3 lg:items-stretch">
          {PACKAGES.map((pkg) => {
            const dark = pkg.tone === "dark";
            const featured = pkg.tone === "featured";
            return (
              <div
                key={pkg.key}
                className={`relative flex flex-col rounded-[28px] p-7 transition hover:-translate-y-1 sm:p-8 ${
                  dark
                    ? "bg-ink text-white shadow-[0_30px_60px_-30px_rgba(20,33,61,.7)]"
                    : featured
                      ? "border-2 border-teal bg-white shadow-[0_30px_60px_-30px_rgba(11,107,80,.45)]"
                      : "border border-hair bg-white hover:shadow-[0_24px_50px_-30px_rgba(20,33,61,.4)]"
                }`}
              >
                {featured && (
                  <span className="absolute -top-3.5 left-7 inline-flex items-center gap-1.5 rounded-full bg-teal px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white">
                    <Sparkles size={12} /> Most popular
                  </span>
                )}
                <span className={`text-xs font-extrabold uppercase tracking-[0.16em] ${dark ? "text-[#FFE27A]" : featured ? "text-teal" : "text-mute"}`}>{pkg.name}</span>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-[44px] font-extrabold leading-none tracking-[-0.03em]">{pkg.price}</span>
                  <span className={`text-sm ${dark ? "text-white/60" : "text-mute"}`}>{pkg.note}</span>
                </div>
                <p className={`m-0 mt-4 text-[15px] leading-relaxed ${dark ? "text-white/75" : "text-mute"}`}>{pkg.line}</p>
                <ul className="m-0 mb-8 mt-6 grid list-none gap-2.5 p-0">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5 text-[14px] leading-snug">
                      <span className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${dark ? "bg-[#5DBB46] text-ink" : "bg-teal/10 text-teal"}`}><Check size={11} strokeWidth={3.5} /></span>
                      <span className={dark ? "text-white/90" : "text-ink"}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={signUpHref}
                  className={`mt-auto inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold no-underline transition hover:-translate-y-px ${
                    dark ? "bg-white text-ink" : featured ? "bg-teal text-white" : "border border-hair bg-paper text-ink"
                  }`}
                >
                  {pkg.cta} <ArrowRight size={15} />
                </Link>
              </div>
            );
          })}
        </div>
        <p className="mx-auto m-0 mt-8 max-w-[760px] text-center text-[13px] leading-relaxed text-mute">
          Packages are bought inside SOUP once your access is approved. University application fees, deposits, tuition, visa and government charges, tests, insurance and accommodation are paid separately to those providers and aren&apos;t included in any package.
        </p>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- journal */


function ArticleCover({ article, large = false }: { article: JournalArticle; large?: boolean }) {
  return (
    <div className={`relative flex items-end overflow-hidden ${large ? "h-64 sm:h-80" : "h-40"}`} style={{ background: `linear-gradient(135deg, ${article.cover.from}, ${article.cover.to})`, color: article.cover.ink }}>
      <div aria-hidden className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/15" />
      <div aria-hidden className="absolute bottom-[-40px] right-16 h-28 w-28 rounded-full bg-white/10" />
      <span aria-hidden className={`absolute right-6 top-5 ${large ? "text-7xl" : "text-5xl"} drop-shadow-sm transition duration-500 group-hover:scale-110 group-hover:-rotate-6`}>{article.emoji}</span>
      <span className="relative m-5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] backdrop-blur">{article.category}</span>
    </div>
  );
}

// Guide front matter categories are editorial codes ("A — A-level guidance",
// "F — Application documents and technology (Companion pillar)"); readers
// only need the plain topic, so drop the code prefix and bracketed note.
function guideLabel(category: string) {
  return category.replace(/^[A-Z/]+\s+—\s+/, "").replace(/\s*\(.*\)\s*$/, "").trim() || "Guide";
}

export function JournalSection({ guides = [] }: { guides?: Guide[] }) {
  const [featured, ...rest] = JOURNAL_ARTICLES;
  return (
    <section id="journal" className="scroll-mt-20 py-16 sm:py-24">
      <div className={shell}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead eyebrow="The SOUP Journal" title="Articles & guides for students on the move." sub="Practical reads on applications, money, visas, housing and life abroad. Free, no account needed." />
          <div className="flex flex-wrap gap-2">
            <Link href="/guides" className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white no-underline transition hover:-translate-y-px">Explore all guides &amp; rankings <ArrowRight size={15} /></Link>
            <Link href="/journal" className="inline-flex items-center gap-2 rounded-full border border-hair bg-white px-5 py-2.5 text-sm font-bold text-ink no-underline transition hover:-translate-y-px">Browse the Journal <ArrowRight size={15} /></Link>
          </div>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <Link href={`/journal/${featured.slug}`} className="group flex flex-col overflow-hidden rounded-[28px] border border-hair bg-white no-underline transition hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(20,33,61,.45)]">
            <ArticleCover article={featured} large />
            <div className="flex flex-1 flex-col p-6 sm:p-8">
              <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#B23C0B]">Cover story · {featured.readMinutes} min read</span>
              <h3 className="m-0 mt-2 text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-ink">{featured.title}</h3>
              <p className="m-0 mt-2 text-[15px] leading-relaxed text-mute">{featured.dek}</p>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-bold text-ink">Read the story <ArrowRight size={15} className="transition group-hover:translate-x-1" /></span>
            </div>
          </Link>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            {rest.slice(0, 3).map((article) => (
              <Link key={article.slug} href={`/journal/${article.slug}`} className="group flex overflow-hidden rounded-[24px] border border-hair bg-white no-underline transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-30px_rgba(20,33,61,.45)]">
                <div className="w-28 shrink-0 sm:w-32" style={{ background: `linear-gradient(135deg, ${article.cover.from}, ${article.cover.to})` }}>
                  <span aria-hidden className="flex h-full items-center justify-center text-4xl transition duration-500 group-hover:scale-110">{article.emoji}</span>
                </div>
                <div className="flex flex-col justify-center p-4 sm:p-5">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-teal">{article.category} · {article.readMinutes} min</span>
                  <h3 className="m-0 mt-1 text-[16px] font-extrabold leading-snug text-ink">{article.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
        {guides.length > 0 && (
          <div className="mt-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="m-0 text-xl font-extrabold text-ink">In-depth guides</h3>
              <Link href="/guides" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink no-underline hover:text-teal">All {guides.length} guides <ArrowRight size={15} /></Link>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {guides.slice(0, 6).map((guide) => (
                <Link key={guide.slug} href={guide.path} className="group flex flex-col rounded-[22px] border border-hair bg-white p-5 no-underline transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-30px_rgba(20,33,61,.45)]">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-teal">{guideLabel(guide.category)}</span>
                  <span className="mt-1.5 text-[16px] font-extrabold leading-snug text-ink">{guide.h1 || guide.title}</span>
                  <span className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-mute">{guide.metaDescription}</span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[13px] font-bold text-ink">Read the guide <ArrowRight size={14} className="transition group-hover:translate-x-1" /></span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ faq + cta */

export function FaqSection() {
  return (
    <section className="py-16 sm:py-20">
      <div className={`${shell} grid gap-10 lg:grid-cols-[0.8fr_1.2fr]`}>
        <SectionHead eyebrow="Good questions" title="Before you request access." />
        <div className="space-y-3">
          {LANDING_FAQ.map((item) => (
            <details key={item.q} className="group rounded-2xl border border-hair bg-white px-5 py-4 open:shadow-[0_20px_40px_-30px_rgba(20,33,61,.4)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-extrabold text-ink [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper text-lg leading-none transition group-open:rotate-45">+</span>
              </summary>
              <p className="m-0 mt-3 text-[15px] leading-relaxed text-mute">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta({ signUpHref }: { signUpHref: string }) {
  return (
    <section className="px-5 pb-16 sm:px-8 sm:pb-24">
      <div className="relative mx-auto max-w-[1280px] overflow-hidden rounded-[36px] bg-ink px-6 py-16 text-center text-white sm:px-12 sm:py-20">
        <div aria-hidden className="landing-blob absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#1F3FA8]/60 blur-3xl" />
        <div aria-hidden className="landing-blob absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-[#0B6B50]/60 blur-3xl" style={{ animationDelay: "-8s" }} />
        <div aria-hidden className="landing-blob absolute right-1/3 top-0 h-56 w-56 rounded-full bg-[#E8B90C]/30 blur-3xl" style={{ animationDelay: "-4s" }} />
        <div className="relative flex flex-col items-center">
          <Sparkles size={26} className="text-[#FFE27A]" />
          <h2 className="m-0 mt-4 max-w-[720px] text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[52px]">Your future campus is waiting.</h2>
          <p className="m-0 mt-4 max-w-[520px] text-[16px] leading-relaxed text-white/75">Request access today. Once you&apos;re approved, everything you need to study abroad is one sign-in away.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={signUpHref} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-extrabold text-ink no-underline transition hover:-translate-y-px">Request access <ArrowRight size={16} /></Link>
            <a href="#signin" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3.5 text-sm font-bold text-white no-underline transition hover:bg-white/10">I already have access</a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter({ anchorBase = "" }: { anchorBase?: string }) {
  return (
    <footer className="border-t border-hair bg-white/60">
      <div className={`${shell} flex flex-col gap-8 py-10 md:flex-row md:items-start md:justify-between`}>
        <div className="max-w-[320px]">
          <BrandLogo />
          <p className="m-0 mt-3 text-sm leading-relaxed text-mute">Students Online University Portal — your AI-powered study-abroad journey, from university discovery to departure.</p>
        </div>
        <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <span className="font-extrabold text-ink">SOUP</span>
            <Link href="/about" className="text-mute no-underline hover:text-ink">About us &amp; team</Link>
            <a href={`${anchorBase}#inside`} className="text-mute no-underline hover:text-ink">How it works</a>
            <a href={`${anchorBase}#partners`} className="text-mute no-underline hover:text-ink">Partners</a>
            <a href={`${anchorBase}#packages`} className="text-mute no-underline hover:text-ink">Packages</a>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-extrabold text-ink">Read</span>
            <Link href="/guides" className="text-mute no-underline hover:text-ink">Guides</Link>
            <Link href="/guides#ranking-guides" className="text-mute no-underline hover:text-ink">Ranking guides</Link>
            <Link href="/journal" className="text-mute no-underline hover:text-ink">The Journal</Link>
            <Link href="/guides" className="text-mute no-underline hover:text-ink">Guides</Link>
            <a href={`${anchorBase}#insurance`} className="text-mute no-underline hover:text-ink">Student insurance</a>
            <a href={`mailto:${SOUP_SUPPORT_EMAIL}`} className="text-mute no-underline hover:text-ink">Contact us</a>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-extrabold text-ink">Account</span>
            <a href={`${anchorBase}#signin`} className="text-mute no-underline hover:text-ink">Sign in</a>
            <Link href="/sign-up" className="text-mute no-underline hover:text-ink">Request access</Link>
            <span className="flex items-center gap-1.5 text-mute"><MessageCircle size={13} />Ask Noodles inside</span>
          </div>
        </div>
      </div>
      <div className={`${shell} flex items-center justify-between border-t border-hair py-5 text-xs text-mute`}>
        <span>© {new Date().getFullYear()} SOUP. All rights reserved.</span>
        <a href={`mailto:${SOUP_SUPPORT_EMAIL}`} className="flex items-center gap-1.5 text-mute no-underline hover:text-ink"><Mail size={12} />{SOUP_SUPPORT_EMAIL}</a>
      </div>
    </footer>
  );
}
