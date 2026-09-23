import Link from "next/link";
import { CheckCircle2, Circle, FileText, PlaneTakeoff, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { deadlineStatus } from "@/lib/student/status";
import { isSupersededChecklist } from "@/lib/journey/checklists";

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in (this app is used on
// shared/school devices) — see the fix and full explanation in
// src/app/actions/auth.ts (invalidateAuthenticatedPages). requireProfile()/
// requireRole() already force dynamic rendering implicitly via cookies(),
// but that is an implicit guarantee a future refactor could silently
// break; this makes it explicit and impossible to regress unnoticed.
export const dynamic = "force-dynamic";

function nice(value: string) { return value.toLowerCase().split("_").map((x)=>x.charAt(0).toUpperCase()+x.slice(1)).join(" "); }

export default async function VisaPage() {
  const { profile } = await requireProfile();
  const [studentCase, applications, allChecklists] = await Promise.all([
    prisma.studentCase.findUnique({ where: { profileId: profile.id } }),
    prisma.studentApplication.findMany({ where: { profileId: profile.id, status: { in: ["OFFER_RECEIVED","CONDITIONAL_OFFER","ENROLLED"] } }, include: { university: true, program: true }, orderBy: { updatedAt: "desc" } }),
    prisma.journeyChecklist.findMany({ where: { profileId: profile.id, kind: "VISA" }, include: { items: { include: { document: true }, orderBy: { position: "asc" } } }, orderBy: { updatedAt: "desc" }, take: 12 }),
  ]);
  const checklists = allChecklists.filter((x)=>!isSupersededChecklist(x.sourceSnapshot));
  const active = checklists[0] || null;
  const completed = active?.items.filter((i)=>["COMPLETE","NOT_APPLICABLE","DOCUMENT_UPLOADED"].includes(i.status)).length || 0;
  const total = active?.items.length || 0;
  const open = active?.items.filter((i)=>!["COMPLETE","NOT_APPLICABLE"].includes(i.status)) || [];

  return <div className="min-h-screen bg-paper"><Header signedIn/><main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
    <section className="rounded-[28px] bg-navy px-6 py-7 text-white sm:px-8">
      <div className="flex items-start justify-between gap-5"><div><div className="text-xs font-semibold uppercase tracking-[.18em] text-white/55">My SOUP · Visa</div><h1 className="mt-2 text-2xl font-semibold">Visa command centre</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Your offer, current official-source visa checklist, documents and next actions in one place. SOUP guidance never replaces the embassy or immigration authority.</p></div><PlaneTakeoff className="hidden sm:block"/></div>
    </section>

    {!applications.length ? <section className="mt-5 rounded-2xl border border-hair bg-white p-7"><h2 className="text-sm font-semibold text-ink">Visa planning opens after an offer</h2><p className="mt-2 text-xs leading-5 text-mute">Once an offer is recorded, Noodles can prepare a destination-specific visa checklist from official sources and track it here.</p><Link href="/applications" className="mt-4 inline-flex rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white">View applications</Link></section> : <>
      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-hair bg-white p-5"><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Current stage</div><div className="mt-2 text-sm font-semibold text-ink">{studentCase?.stage ? nice(studentCase.stage) : "Offer received"}</div><div className="mt-1 text-xs text-mute">{applications[0]?.university?.country || "Destination country"}</div></div>
        <div className="rounded-2xl border border-hair bg-white p-5"><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Checklist</div><div className="mt-2 text-sm font-semibold text-ink">{active ? `${completed}/${total} supplied or complete` : "Not prepared yet"}</div><div className="mt-1 text-xs text-mute">{active?.sourceCheckedAt ? `Official source checked ${active.sourceCheckedAt.toLocaleDateString()}` : "Ask Noodles to verify current requirements"}</div></div>
        <div className="rounded-2xl border border-hair bg-white p-5"><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Next action</div><div className="mt-2 text-sm font-semibold text-ink">{open[0]?.title || (active ? "Nothing required from you right now" : "Prepare visa checklist")}</div><div className="mt-1 text-xs text-mute">{open[0]?.dueAt ? deadlineStatus(open[0].dueAt).label : "SOUP will keep the case moving"}</div></div>
      </section>

      <section className="mt-5 rounded-2xl border border-hair bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-ink">Offer being used for visa planning</h2><p className="mt-1 text-xs text-mute">If you have multiple offers, confirm the university you intend to proceed with before visa submission.</p></div><Link href="/offers" className="text-xs font-semibold text-navy">Review offers</Link></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{applications.map((app)=><div key={app.id} className="rounded-xl bg-paper p-4"><div className="text-xs font-semibold text-ink">{app.university?.name || "University"}</div><div className="mt-1 text-[11px] text-mute">{app.program?.title || "Program"} · {nice(app.status)}</div></div>)}</div></section>

      <section className="mt-5 rounded-2xl border border-hair bg-white p-5"><div className="flex items-center gap-2"><ShieldCheck size={15} className="text-teal"/><h2 className="text-sm font-semibold text-ink">Visa requirements</h2></div>{!active ? <div className="mt-4 rounded-xl bg-paper p-4"><div className="text-xs font-semibold text-ink">No verified visa checklist yet</div><p className="mt-1 text-xs leading-5 text-mute">Ask Noodles to research the current embassy/immigration requirements for your destination and save them to your case.</p><Link href="/counselor?intent=visa" className="mt-3 inline-flex rounded-xl bg-navy px-3 py-2 text-[11px] font-semibold text-white">Ask Noodles about my visa</Link></div> : <div className="mt-4 divide-y divide-hair">{active.items.map((item)=>{ const done=["COMPLETE","NOT_APPLICABLE","DOCUMENT_UPLOADED"].includes(item.status); return <div key={item.id} className="flex items-start gap-3 py-4"><div className={done?"text-teal":"text-mute"}>{done?<CheckCircle2 size={16}/>:<Circle size={16}/>}</div><div className="min-w-0 flex-1"><div className="text-xs font-semibold text-ink">{item.title}</div>{item.description&&<p className="mt-1 text-[11px] leading-5 text-mute">{item.description}</p>}<div className="mt-2 flex flex-wrap gap-2 text-[10px] text-mute"><span>{nice(item.status)}</span>{item.dueAt&&<span>{deadlineStatus(item.dueAt).label}</span>}{item.document&&<span className="inline-flex items-center gap-1"><FileText size={10}/>{item.document.originalFileName || "Document supplied"}</span>}</div></div></div>})}</div>}</section>
    </>}
  </main></div>;
}
