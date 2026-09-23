import Link from "next/link";
import { ArrowUpRight, Check, Download, ExternalLink, MinusCircle, Star } from "lucide-react";
import { Header } from "@/components/Header";
import { StartApplicationButton } from "@/components/applications/StartApplicationButton";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { safeHttpUrl, safeResearchSources } from "@/lib/security/urls";
import { setShortlistDecision } from "@/app/actions/shortlists";

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in (this app is used on
// shared/school devices) — see the fix and full explanation in
// src/app/actions/auth.ts (invalidateAuthenticatedPages). requireProfile()/
// requireRole() already force dynamic rendering implicitly via cookies(),
// but that is an implicit guarantee a future refactor could silently
// break; this makes it explicit and impossible to regress unnoticed.
export const dynamic = "force-dynamic";

function groundingSources(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [] as { title: string; url: string }[];
  return safeResearchSources((value as Record<string, unknown>).groundingSources, 12);
}

export default async function ApplicationPlanPage({ params }: { params: { id: string } }) {
  const { profile } = await requireProfile();
  const plan = await prisma.universityShortlist.findFirst({
    where: { id: params.id, profileId: profile.id },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { university: true, program: true },
      },
    },
  });

  if (!plan) {
    return (
      <div className="min-h-screen bg-paper">
        <Header signedIn/>
        <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
          <div className="rounded-2xl border border-hair bg-white p-8 text-center">
            <h1 className="text-lg font-semibold text-ink">Application plan not found</h1>
            <Link href="/plans" className="mt-4 inline-flex rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white">Back to plans</Link>
          </div>
        </main>
      </div>
    );
  }

  const summary = plan.researchSummary && typeof plan.researchSummary === "object" && !Array.isArray(plan.researchSummary)
    ? plan.researchSummary as Record<string, unknown>
    : {};
  const researchSources = groundingSources(summary);
  const studentSummary = typeof summary.studentSummary === "string" && summary.studentSummary.trim()
    ? summary.studentSummary
    : "Saved from your Noodles research.";
  const sourceCheckedAt = typeof summary.sourceCheckedAt === "string" || typeof summary.sourceCheckedAt === "number"
    ? summary.sourceCheckedAt
    : null;

  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn/>
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">University Application Plan · v{plan.version}</div>
            <h1 className="mt-2 text-2xl font-semibold text-ink">{plan.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">{studentSummary}</p>
          </div>
          <div className="flex flex-wrap gap-2"><Link href={`/plans/${plan.id}/compare`} className="inline-flex items-center justify-center rounded-xl border border-hair bg-white px-4 py-2.5 text-sm font-semibold text-ink">Compare choices</Link><a href={`/api/export/application-plan?id=${encodeURIComponent(plan.id)}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white"><Download size={14}/> Download PDF</a></div>
        </div>

        {researchSources.length > 0 && (
          <section className="mt-5 rounded-2xl border border-hair bg-white p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">Research sources</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {researchSources.map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 rounded-full border border-hair bg-paper px-3 py-1.5 text-[11px] font-semibold text-navy">
                  <span className="max-w-[260px] truncate">{source.title}</span><ArrowUpRight size={10}/>
                </a>
              ))}
            </div>
            {sourceCheckedAt !== null && <div className="mt-3 text-[11px] text-mute">Research generated {new Date(sourceCheckedAt).toLocaleString()}</div>}
          </section>
        )}

        <section className="mt-6 space-y-3">
          {plan.items.map((item, index) => {
            const sources = Array.isArray(item.sourceUrls)
              ? item.sourceUrls.map((value) => safeHttpUrl(value, 1200)).filter((value): value is string => Boolean(value))
              : [];
            const cautions = Array.isArray(item.cautions)
              ? item.cautions.filter((value): value is string => typeof value === "string")
              : [];

            return (
              <div key={item.id} className="rounded-2xl border border-hair bg-white p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{index + 1}. {item.university.name}</span>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.isPartnerAtGeneration ? "bg-[#F0F7F5] text-teal" : "bg-paper text-mute"}`}>{item.isPartnerAtGeneration ? "SOUP Partner" : "Independent Recommendation"}</span>
                      {item.studentDecision && <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.studentDecision === "FINALIST" ? "bg-[#EAF0F5] text-navy" : item.studentDecision === "KEEP" ? "bg-[#F0F7F5] text-teal" : "bg-[#FFF4F2] text-[#9B3A32]"}`}>{item.studentDecision === "FINALIST" ? "Final choice" : item.studentDecision === "KEEP" ? "Kept" : "Removed"}</span>}
                    </div>
                    <div className="mt-1 text-xs text-mute">{item.university.country}{item.university.city ? ` · ${item.university.city}` : ""}</div>
                    {item.program && <div className="mt-3 text-sm font-medium text-ink">{item.program.title} · {item.program.level}</div>}
                    {item.program?.tuitionAmount && <div className="mt-1 text-xs text-mute">Tuition: {item.program.tuitionCurrency || ""} {String(item.program.tuitionAmount)}{item.program.intake ? ` · Intake: ${item.program.intake}` : ""}</div>}
                    {item.eligibilityStatus && <div className="mt-2 text-xs font-medium text-navy">{item.eligibilityStatus.replaceAll("_", " ")}</div>}
                  </div>
                  {item.isPartnerAtGeneration
                    ? <StartApplicationButton shortlistItemId={item.id} universityId={item.universityId} programId={item.programId}/>
                    : sources[0]
                      ? <a target="_blank" rel="noreferrer" href={sources[0]} className="inline-flex items-center gap-1 rounded-xl border border-hair px-3 py-2 text-xs font-semibold text-ink">Official source <ExternalLink size={11}/></a>
                      : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-hair pt-4">
                  <form action={setShortlistDecision.bind(null, item.id, plan.id, "KEEP")}><button className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${item.studentDecision === "KEEP" ? "border-teal bg-[#F0F7F5] text-teal" : "border-hair text-ink"}`}><Check size={11}/> Keep</button></form>
                  <form action={setShortlistDecision.bind(null, item.id, plan.id, "FINALIST")}><button className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${item.studentDecision === "FINALIST" ? "border-navy bg-[#EAF0F5] text-navy" : "border-hair text-ink"}`}><Star size={11}/> Final 3</button></form>
                  <form action={setShortlistDecision.bind(null, item.id, plan.id, "REMOVE")}><button className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${item.studentDecision === "REMOVE" ? "border-[#E6C2BD] bg-[#FFF4F2] text-[#9B3A32]" : "border-hair text-mute"}`}><MinusCircle size={11}/> Remove</button></form>
                  {item.studentDecision && <form action={setShortlistDecision.bind(null, item.id, plan.id, "UNDECIDED")}><button className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-mute">Reset</button></form>}
                  <Link href={`/counselor?prompt=${encodeURIComponent(`Why does ${item.university.name} fit me?`)}`} className="rounded-full border border-hair px-3 py-1.5 text-[11px] font-semibold text-navy">Ask Noodles why</Link>
                </div>
                {item.rationale && <p className="mt-4 text-sm leading-6 text-ink">{item.rationale}</p>}
                {cautions.length > 0 && <div className="mt-3 rounded-xl bg-paper px-3 py-2 text-xs leading-5 text-mute">Important: {cautions.join(" · ")}</div>}
                {sources.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{sources.slice(0, 3).map((source) => <a key={source} target="_blank" rel="noreferrer" href={source} className="inline-flex max-w-full items-center gap-1 rounded-full border border-hair px-2.5 py-1 text-[10px] font-semibold text-navy"><span className="max-w-[260px] truncate">Official page</span><ArrowUpRight size={9}/></a>)}</div>}
              </div>
            );
          })}
        </section>

        <div className="mt-6 rounded-2xl border border-hair bg-white p-4 text-xs leading-5 text-mute">SOUP does not display university match percentages. Partner status and academic suitability are separate. Critical requirements should be re-checked on the cited official source before submission.</div>
      </main>
    </div>
  );
}
