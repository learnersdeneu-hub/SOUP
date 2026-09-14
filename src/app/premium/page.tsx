import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Check, Minus, Sparkles, Video, Home, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { PREMIUM_COUNSELING_PRICE_USD, PREMIUM_PLUS_PRICE_USD } from "@/lib/payments/config";

const FEATURES: Array<[string, boolean, boolean, boolean]> = [
  ["Noodles AI guidance", true, true, true],
  ["University & program discovery", true, true, true],
  ["Public/government university research", true, true, true],
  ["Real-time human counselor access", false, true, true],
  ["Managed eligible partner applications", false, true, true],
  ["Priority document & deadline follow-up", false, true, true],
  ["Weekly scheduled video sessions", false, false, true],
  ["Senior/top counselor case oversight", false, false, true],
  ["University-representative sessions when available", false, false, true],
  ["Private accommodation search support", false, false, true],
  ["Offer, visa & pre-departure planning", false, true, true],
  ["High-touch end-to-end case management", false, false, true],
];
export default async function PremiumPage() {
  const user = await getCurrentUser();
  let paid: Array<{ metadata: Prisma.JsonValue; title: string }> = [];
  if (user) {
    const profile = user.user.profile;
    if (profile) {
      paid = await prisma.payment.findMany({
        where: { profileId: profile.id, type: "PREMIUM_COUNSELING", status: "PAID" },
        select: { metadata: true, title: true },
      });
    }
  }
  const plusActive = paid.some((payment) => {
    const metadata = payment.metadata && typeof payment.metadata === "object" && !Array.isArray(payment.metadata)
      ? payment.metadata as Prisma.JsonObject
      : null;
    return metadata?.plan === "premium_plus" || payment.title === "SOUP Concierge" || payment.title === "SOUP Premium Plus";
  });
  const premiumActive = paid.length > 0;
  const buy = (plan:string,label:string) => user ? <form action="/api/payments/premium/checkout" method="post" className="mt-6"><input type="hidden" name="plan" value={plan}/><button className="rounded-xl bg-navy px-5 py-2.5 text-xs font-semibold text-white">{label}</button></form> : <Link href={`/sign-in?next=${encodeURIComponent("/premium")}`} className="mt-6 inline-flex rounded-xl bg-navy px-5 py-2.5 text-xs font-semibold text-white">Sign in to continue</Link>;
  return <div className="min-h-screen bg-paper"><Header signedIn={!!user}/><main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
    <section className="mx-auto max-w-3xl text-center"><div className="inline-flex items-center gap-2 rounded-full border border-hair bg-white px-3 py-1.5 text-xs font-semibold text-navy"><Sparkles size={13}/> SOUP Plans</div><h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Choose how much human support you want around Noodles.</h1><p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-mute">Explore freely, add real-time counseling, or have SOUP run a high-touch application journey with scheduled senior-counselor support.</p></section>
    <section className="mt-10 grid overflow-hidden rounded-3xl border border-hair bg-white lg:grid-cols-3">
      <div className="p-6 sm:p-8"><div className="text-xs font-semibold uppercase tracking-[.16em] text-mute">Free</div><div className="mt-2 text-3xl font-semibold text-ink">$0</div><p className="mt-3 text-sm leading-6 text-mute">Noodles helps you discover, compare and organise your university journey.</p><Link href="/counselor" className="mt-6 inline-flex rounded-xl border border-hair px-4 py-2.5 text-xs font-semibold text-ink">Continue free</Link></div>
      <div className="border-t border-hair bg-[#F7FAFC] p-6 lg:border-l lg:border-t-0 sm:p-8"><div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">SOUP Plus</div><div className="mt-2 text-3xl font-semibold text-ink">${PREMIUM_COUNSELING_PRICE_USD}</div><div className="text-xs text-mute">USD · one-time</div><p className="mt-3 text-sm leading-6 text-mute">Real-time counselor access, human review and managed support for eligible SOUP-network applications.</p>{premiumActive?<Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-teal px-4 py-2.5 text-xs font-semibold text-white">Active · Open My SOUP</Link>:buy("premium","Get SOUP Plus")}</div>
      <div className="border-t border-hair bg-navy/[.035] p-6 lg:border-l lg:border-t-0 sm:p-8"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-navy"><Sparkles size={13}/> SOUP Concierge</div><div className="mt-2 text-3xl font-semibold text-ink">${PREMIUM_PLUS_PRICE_USD}</div><div className="text-xs text-mute">USD · one-time</div><p className="mt-3 text-sm leading-6 text-mute">Our high-touch service: weekly video sessions, senior counselor oversight, private accommodation search and end-to-end case management.</p>{plusActive?<Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-teal px-4 py-2.5 text-xs font-semibold text-white">SOUP Concierge active</Link>:buy("premium_plus",premiumActive?"Upgrade to SOUP Concierge":"Get SOUP Concierge")}</div>
    </section>
    <section className="mt-6 overflow-x-auto rounded-2xl border border-hair bg-white"><div className="min-w-[560px]"><div className="grid grid-cols-[1fr_90px_110px_120px] border-b border-hair bg-paper/60 px-4 py-3 text-[9px] font-semibold uppercase tracking-[.1em] text-mute"><span>What you get</span><span className="text-center">Free</span><span className="text-center">SOUP Plus</span><span className="text-center">Concierge</span></div>{FEATURES.map(([label,f,p,pp])=><div key={label} className="grid grid-cols-[1fr_90px_110px_120px] items-center border-b border-hair px-4 py-3.5 last:border-0"><span className="text-xs font-medium text-ink sm:text-sm">{label}</span>{[f,p,pp].map((v,i)=><span key={i} className="flex justify-center">{v?<Check size={15} className="text-teal"/>:<Minus size={15} className="text-mute"/>}</span>)}</div>)}</div></section>
    <section className="mt-6 grid gap-3 md:grid-cols-3"><div className="rounded-2xl border border-hair bg-white p-5"><Video size={17}/><h2 className="mt-3 text-sm font-semibold">Weekly video sessions</h2><p className="mt-2 text-xs leading-5 text-mute">SOUP Concierge includes scheduled case sessions with senior SOUP/LearnersDen counselors.</p></div><div className="rounded-2xl border border-hair bg-white p-5"><Users size={17}/><h2 className="mt-3 text-sm font-semibold">University access & events</h2><p className="mt-2 text-xs leading-5 text-mute">Where available, we connect students with university representatives, information sessions and relevant student/alumni experiences. Availability is never guaranteed.</p></div><div className="rounded-2xl border border-hair bg-white p-5"><Home size={17}/><h2 className="mt-3 text-sm font-semibold">Private accommodation search</h2><p className="mt-2 text-xs leading-5 text-mute">A counselor can help search and compare suitable accommodation around the chosen university and budget; third-party accommodation costs remain separate.</p></div></section>
    <section className="mt-6 rounded-2xl border border-[#D9E7E3] bg-[#F4FAF8] p-5"><h2 className="text-sm font-semibold text-ink">Third-party and university charges are separate.</h2><p className="mt-2 text-xs leading-5 text-mute">University application fees, deposits, tuition, visa/government charges, tests, insurance, accommodation and other third-party costs are not included in SOUP plan prices. When SOUP records a university application fee, it will be communicated and shown in My SOUP → Payments before submission.</p></section>
  </main></div>;
}
