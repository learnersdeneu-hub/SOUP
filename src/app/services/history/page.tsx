import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BadgeCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";

function pretty(value: string) { return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }

export default async function ServiceHistoryPage() {
  const { profile } = await requireProfile();
  const referrals = await prisma.serviceReferral.findMany({
    where: { profileId: profile.id },
    include: { partner: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return <div className="min-h-screen bg-paper"><Header signedIn/><main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
    <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs font-semibold text-navy"><ArrowLeft size={12}/>My SOUP</Link>
    <div className="mt-4"><div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">My SOUP</div><h1 className="mt-2 text-2xl font-semibold text-ink">Services & partner activity</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-mute">Your SOUP partner referrals stay recorded here. Independent options suggested by the Counselor remain external advice and are not presented as SOUP transactions.</p></div>
    <section className="mt-6 space-y-3">{referrals.length === 0 ? <div className="rounded-2xl border border-hair bg-white p-7 text-sm text-mute">No SOUP partner service has been started yet.</div> : referrals.map((referral) => <article key={referral.id} className="rounded-2xl border border-hair bg-white p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><BadgeCheck size={14} className="text-teal"/><div className="text-sm font-semibold text-ink">{referral.partner?.name || referral.title}</div></div><div className="mt-1 text-xs text-mute">{pretty(referral.type)} · {pretty(referral.status)}</div><p className="mt-3 max-w-2xl text-xs leading-5 text-mute">{referral.counselorRationale || "Started through an active SOUP partner route."}</p><div className="mt-2 text-[10px] text-mute">Last updated {referral.updatedAt.toLocaleString()}</div></div>{referral.externalUrl && <a href={referral.externalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-hair px-3 py-2 text-xs font-semibold text-navy">Partner route <ArrowUpRight size={11}/></a>}</div></article>)}</section>
  </main></div>;
}
