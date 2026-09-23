import Link from "next/link";
import { CheckCircle2, FileText, GraduationCap, TriangleAlert } from "lucide-react";
import { Header } from "@/components/Header";
import { OpenDocumentButton } from "@/components/documents/OpenDocumentButton";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { deadlineStatus } from "@/lib/student/status";

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in (this app is used on
// shared/school devices) — see the fix and full explanation in
// src/app/actions/auth.ts (invalidateAuthenticatedPages). requireProfile()/
// requireRole() already force dynamic rendering implicitly via cookies(),
// but that is an implicit guarantee a future refactor could silently
// break; this makes it explicit and impossible to regress unnoticed.
export const dynamic = "force-dynamic";

function nice(value:string){return value.toLowerCase().split("_").map((x)=>x.charAt(0).toUpperCase()+x.slice(1)).join(" ");}

export default async function OffersPage(){
  const { profile } = await requireProfile();
  const offers = await prisma.studentApplication.findMany({ where:{ profileId:profile.id, status:{in:["OFFER_RECEIVED","CONDITIONAL_OFFER","ENROLLED"]}}, include:{university:true,program:true,offerDocument:true,payments:true,offerConditions:{orderBy:[{status:"asc"},{dueAt:"asc"}]},checklists:{include:{items:true}}}, orderBy:{decisionAt:"desc"} });
  return <div className="min-h-screen bg-paper"><Header signedIn/><main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">My SOUP</div><h1 className="mt-1 text-2xl font-semibold text-ink">Offers & decisions</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-mute">Understand every offer, condition, deposit and next step before accepting. University correspondence remains authoritative.</p></div><Link href="/visa" className="rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white">Open visa centre</Link></div>
    {!offers.length?<section className="mt-6 rounded-2xl border border-hair bg-white p-8 text-center"><GraduationCap className="mx-auto text-navy"/><h2 className="mt-3 text-sm font-semibold text-ink">No offers recorded yet</h2><p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-mute">When a university decision is recorded, it will appear here with the official letter, conditions and next actions.</p></section>:<div className="mt-6 space-y-4">{offers.map((app)=>{
      const admission = app.checklists.find((x)=>x.kind==="ADMISSION");
      const checklistIncomplete = admission?.items.filter((i)=>i.required && !["COMPLETE","NOT_APPLICABLE"].includes(i.status)) || [];
      const incomplete = app.offerConditions.length ? app.offerConditions.filter((i)=>!["COMPLETE","WAIVED"].includes(i.status)) : checklistIncomplete;
      const deposit = app.payments.find((p)=>/deposit/i.test(p.title));
      return <article key={app.id} className="rounded-2xl border border-hair bg-white p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${app.status==="CONDITIONAL_OFFER"?"bg-[#FFF7DF] text-[#80651A]":"bg-[#F0F7F5] text-teal"}`}>{nice(app.status)}</span>{app.decisionAt&&<span className="text-[10px] text-mute">Received {app.decisionAt.toLocaleDateString()}</span>}</div><h2 className="mt-3 text-base font-semibold text-ink">{app.university?.name || "University"}</h2><p className="mt-1 text-xs text-mute">{app.program?.title || "Program"}</p></div><div className="flex flex-wrap gap-2">{app.offerDocument?<OpenDocumentButton documentId={app.offerDocument.id}/>:<span className="rounded-xl bg-[#FFF0F0] px-3 py-2 text-[11px] font-semibold text-[#9A3434]">Offer letter missing</span>}<Link href={`/applications/${app.id}`} className="rounded-xl border border-hair px-3 py-2 text-[11px] font-semibold text-ink">Application</Link></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-paper p-4"><div className="text-[10px] uppercase tracking-[.12em] text-mute">Conditions</div><div className="mt-2 text-xs font-semibold text-ink">{app.status==="CONDITIONAL_OFFER" ? `${incomplete.length || "Some"} item${incomplete.length===1?"":"s"} to resolve` : "No outstanding condition recorded"}</div></div><div className="rounded-xl bg-paper p-4"><div className="text-[10px] uppercase tracking-[.12em] text-mute">Deposit / payment</div><div className="mt-2 text-xs font-semibold text-ink">{deposit?`${deposit.currency} ${deposit.amount} · ${nice(deposit.status)}`:"No deposit recorded"}</div>{deposit?.dueAt&&<div className="mt-1 text-[10px] text-mute">{deadlineStatus(deposit.dueAt).label}</div>}</div><div className="rounded-xl bg-paper p-4"><div className="text-[10px] uppercase tracking-[.12em] text-mute">Next</div><div className="mt-2 text-xs font-semibold text-ink">{app.status==="CONDITIONAL_OFFER"?"Clear conditions before relying on the offer":"Review acceptance, payment and visa timing"}</div></div></div>
      {incomplete.length>0&&<div className="mt-4 rounded-xl border border-[#F3DFC1] bg-[#FFF9EC] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-[#80651A]"><TriangleAlert size={13}/>Conditions / unresolved admission items</div><div className="mt-3 grid gap-2 sm:grid-cols-2">{incomplete.slice(0,6).map((item)=><div key={item.id} className="flex items-center gap-2 text-[11px] text-mute"><CheckCircle2 size={11}/>{item.title}{"dueAt" in item && item.dueAt ? ` · due ${item.dueAt.toLocaleDateString()}` : ""}</div>)}</div></div>}
      <div className="mt-4 flex flex-wrap gap-2"><Link href={`/counselor?intent=offer&applicationId=${encodeURIComponent(app.id)}`} className="rounded-xl bg-navy px-3 py-2 text-[11px] font-semibold text-white">Ask Noodles to explain this offer</Link><Link href="/payments" className="inline-flex items-center gap-1 rounded-xl border border-hair px-3 py-2 text-[11px] font-semibold text-ink"><FileText size={11}/>Payments</Link></div>
      </article>})}</div>}
  </main></div>;
}
