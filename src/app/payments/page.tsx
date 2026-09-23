import Link from "next/link";
import { CreditCard, Clock3, CheckCircle2, AlertCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { PREMIUM_COUNSELING_PRICE_USD, PREMIUM_PLUS_PRICE_USD } from "@/lib/payments/config";

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in (this app is used on
// shared/school devices) — see the fix and full explanation in
// src/app/actions/auth.ts (invalidateAuthenticatedPages). requireProfile()/
// requireRole() already force dynamic rendering implicitly via cookies(),
// but that is an implicit guarantee a future refactor could silently
// break; this makes it explicit and impossible to regress unnoticed.
export const dynamic = "force-dynamic";

function money(value: unknown, currency = "USD") { const n = Number(value || 0); return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n); }

export default async function PaymentsPage({ searchParams }: { searchParams: { success?: string; cancelled?: string; error?: string; premium?: string } }) {
  const { profile } = await requireProfile();
  const [payments, applications] = await Promise.all([
    prisma.payment.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.studentApplication.findMany({ where: { profileId: profile.id, applicationFeeStatus: { in: ["REQUIRED","PENDING","PAID","WAIVED"] } }, include: { university: true, program: true }, orderBy: { updatedAt: "desc" } }),
  ]);
  const premiumPayments = payments.filter((p) => p.type === "PREMIUM_COUNSELING" && p.status === "PAID");
  const plusActive = premiumPayments.some((p) => {
    const metadata = p.metadata && typeof p.metadata === "object" && !Array.isArray(p.metadata) ? p.metadata as Record<string, unknown> : {};
    return p.title === "SOUP Concierge" || p.title === "SOUP Premium Plus" || metadata.plan === "premium_plus";
  });
  const premiumActive = premiumPayments.length > 0;
  const pending = payments.filter((p) => ["PENDING","REQUIRES_ACTION"].includes(p.status)).length + applications.filter((a) => ["REQUIRED","PENDING"].includes(a.applicationFeeStatus)).length;
  return <div className="min-h-screen bg-paper"><Header signedIn/><main className="mx-auto max-w-5xl px-5 py-8 sm:px-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-semibold text-ink">Payments</h1><p className="mt-2 text-sm text-mute">SOUP plans and university application fees are tracked separately here.</p></div><Link href="/premium" className="rounded-xl border border-hair bg-white px-4 py-2.5 text-xs font-semibold text-navy">View plans</Link></div>
  {searchParams.success&&<div className="mt-5 rounded-xl border border-[#D9E7E3] bg-[#F4FAF8] p-4 text-sm text-teal">Payment confirmed. Your SOUP support plan is now active.</div>}{searchParams.cancelled&&<div className="mt-5 rounded-xl border border-hair bg-white p-4 text-sm text-mute">Checkout was cancelled. Nothing was charged.</div>}{searchParams.error&&<div className="mt-5 rounded-xl border border-[#F1D7D4] bg-[#FFF7F6] p-4 text-sm text-[#9B3A32]">{searchParams.error}</div>}
  <section className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-hair bg-white p-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-mute"><CreditCard size={14}/> SOUP plan</div><div className="mt-2 text-lg font-semibold text-ink">{plusActive?"SOUP Concierge active":premiumActive?"SOUP Plus active":`$${PREMIUM_COUNSELING_PRICE_USD} / $${PREMIUM_PLUS_PRICE_USD}` }</div><div className="mt-1 text-xs text-mute">{plusActive?"High-touch SOUP Concierge enabled":premiumActive?"SOUP Plus enabled":"Two one-time support levels"}</div></div><div className="rounded-2xl border border-hair bg-white p-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-mute"><Clock3 size={14}/> Pending</div><div className="mt-2 text-lg font-semibold text-ink">{pending}</div><div className="mt-1 text-xs text-mute">Items waiting for payment/action</div></div><div className="rounded-2xl border border-hair bg-white p-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-mute"><CheckCircle2 size={14}/> Paid</div><div className="mt-2 text-lg font-semibold text-ink">{payments.filter((p)=>p.status==="PAID").length + applications.filter((a)=>a.applicationFeeStatus==="PAID").length}</div><div className="mt-1 text-xs text-mute">Confirmed payment records</div></div></section>
  {!premiumActive&&<section className="mt-5 rounded-2xl border border-[#C9D8E6] bg-[#F4F8FB] p-5"><div className="flex items-center justify-between gap-4"><div><div className="text-sm font-semibold text-ink">SOUP Plus</div><p className="mt-1 text-xs leading-5 text-mute">Real-time counselors and managed partner-university application support.</p></div><Link href="/premium" className="shrink-0 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white">Compare $54 / $500 plans</Link></div></section>}
  <section className="mt-5 rounded-2xl border border-hair bg-white p-5"><h2 className="text-base font-semibold text-ink">University application fees</h2><p className="mt-1 text-xs leading-5 text-mute">University fees are separate from your SOUP plan. SOUP records the amount and status here when the university requires one.</p><div className="mt-4 divide-y divide-hair">{applications.length===0?<div className="py-6 text-sm text-mute">No university application fees have been recorded yet.</div>:applications.map((a)=><div key={a.id} className="flex flex-col justify-between gap-2 py-4 sm:flex-row sm:items-center"><div><div className="text-sm font-semibold text-ink">{a.university?.name || "University application"}</div><div className="mt-1 text-xs text-mute">{a.program?.title || "Program"} · {a.intake || "Intake not recorded"}</div></div><div className="text-left sm:text-right"><div className="text-sm font-semibold text-ink">{a.applicationFeeAmount ? money(a.applicationFeeAmount, a.applicationFeeCurrency || "USD") : "Amount to be communicated"}</div><div className="mt-1 text-[10px] font-semibold uppercase tracking-[.1em] text-mute">{a.applicationFeeStatus.replaceAll("_"," ")}</div></div></div>)}</div></section>
  <section className="mt-5 rounded-2xl border border-hair bg-white p-5"><h2 className="text-base font-semibold text-ink">SOUP payment history</h2><div className="mt-4 divide-y divide-hair">{payments.length===0?<div className="py-6 text-sm text-mute">No SOUP payment activity yet.</div>:payments.map((p)=><div key={p.id} className="flex items-center justify-between gap-4 py-4"><div><div className="text-sm font-semibold text-ink">{p.title}</div><div className="mt-1 text-xs text-mute">{p.description || p.type.replaceAll("_"," ")}</div><div className="mt-1 text-[10px] text-mute">{p.createdAt.toLocaleString()}</div></div><div className="text-right"><div className="text-sm font-semibold text-ink">{money(p.amount,p.currency)}</div><div className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[.1em] ${p.status==="PAID"?"text-teal":p.status==="FAILED"?"text-[#9B3A32]":"text-mute"}`}>{p.status==="FAILED"?<AlertCircle size={11}/>:null}{p.status.replaceAll("_"," ")}</div></div></div>)}</div></section>
  </main></div>;
}
