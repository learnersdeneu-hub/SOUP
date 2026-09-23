import Link from "next/link";
import { ArrowLeft, BadgeDollarSign, ExternalLink } from "lucide-react";
import { Header } from "@/components/Header";
import { updateReferralCommercials } from "@/app/actions/referrals";
import { requireRole } from "@/lib/auth/currentUser";
import { COMMERCIAL_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import type { Prisma, ServiceReferralStatus, ServiceReferralType } from "@prisma/client";

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in (this app is used on
// shared/school devices) — see the fix and full explanation in
// src/app/actions/auth.ts (invalidateAuthenticatedPages). requireProfile()/
// requireRole() already force dynamic rendering implicitly via cookies(),
// but that is an implicit guarantee a future refactor could silently
// break; this makes it explicit and impossible to regress unnoticed.
export const dynamic = "force-dynamic";

const REFERRAL_TYPES = ["ACCOMMODATION", "INSURANCE", "STUDENT_FINANCE", "SCHOLARSHIP", "TRAVEL", "ATTESTATION", "OTHER"] as const satisfies readonly ServiceReferralType[];
const REFERRAL_STATUSES = ["RECOMMENDED", "OPENED", "STARTED", "COMPLETED", "DECLINED", "EXTERNAL_ONLY"] as const satisfies readonly ServiceReferralStatus[];

function pretty(value: string) {
  return value.replaceAll("_", " ");
}

export default async function AdminReferralsPage({ searchParams }: { searchParams: { type?: string; status?: string } }) {
  const current = await requireRole(COMMERCIAL_ROLES);
  const rawType = String(searchParams.type || "").trim();
  const rawStatus = String(searchParams.status || "").trim();
  const type = REFERRAL_TYPES.includes(rawType as ServiceReferralType) ? rawType as ServiceReferralType : undefined;
  const status = REFERRAL_STATUSES.includes(rawStatus as ServiceReferralStatus) ? rawStatus as ServiceReferralStatus : undefined;
  const roleTypeScope: Prisma.ServiceReferralWhereInput = current.user.role === "ACCOMMODATION"
    ? { type: "ACCOMMODATION" }
    : current.user.role === "FINANCE"
      ? { type: { in: ["STUDENT_FINANCE", "INSURANCE", "SCHOLARSHIP"] } }
      : {};
  const referrals = await prisma.serviceReferral.findMany({
    where: {
      ...roleTypeScope,
      ...(type && current.user.role !== "ACCOMMODATION" ? { type } : {}),
      ...(status ? { status } : {}),
    },
    include: { partner: true, profile: { include: { user: true } } },
    orderBy: { updatedAt: "desc" },
    take: 150,
  });
  const completed = referrals.filter((referral) => referral.status === "COMPLETED").length;
  const counselorAttributed = referrals.filter((referral) => Boolean(referral.sourceSessionId)).length;
  const revenueRecorded = referrals.filter((referral) => referral.revenueAmount !== null || referral.commissionAmount !== null).length;

  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn/>
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <Link href="/admin" className="inline-flex items-center gap-1 text-xs font-semibold text-navy"><ArrowLeft size={12}/>Admin</Link>
        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">SOUP commercial operations</div>
            <h1 className="mt-2 text-2xl font-semibold text-ink">Partner referrals & attribution</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">Track which partner route a student opened, whether the referral came from the Counselor, and the eventual partner reference/revenue/commission. Different currencies are stored separately and are not falsely summed together.</p>
          </div>
          <BadgeDollarSign size={24} className="text-navy"/>
        </div>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[["Referrals in view", referrals.length], ["Completed", completed], ["Counselor-attributed", counselorAttributed], ["Commercials recorded", revenueRecorded]].map(([label, value]) => <div key={label} className="rounded-2xl border border-hair bg-white p-4"><div className="text-2xl font-semibold text-ink">{value}</div><div className="mt-1 text-xs text-mute">{label}</div></div>)}
        </section>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/admin/referrals" className="rounded-full border border-hair bg-white px-3 py-1.5 text-xs font-semibold text-ink">All</Link>
          {[["Insurance", "INSURANCE"], ["Accommodation", "ACCOMMODATION"], ["Finance", "STUDENT_FINANCE"], ["Scholarship", "SCHOLARSHIP"]].map(([label, value]) => <Link key={value} href={`/admin/referrals?type=${value}`} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${type === value ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink"}`}>{label}</Link>)}
        </div>

        <section className="mt-5 space-y-3">
          {referrals.length === 0 ? <div className="rounded-2xl border border-hair bg-white p-8 text-sm text-mute">No referrals match this view.</div> : referrals.map((referral) => {
            const metadata = referral.metadata && typeof referral.metadata === "object" && !Array.isArray(referral.metadata) ? referral.metadata as Record<string, unknown> : {};
            return (
              <article key={referral.id} className="rounded-2xl border border-hair bg-white p-5">
                <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr_1.5fr]">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-teal">{pretty(referral.type)}</div>
                    <div className="mt-1 text-sm font-semibold text-ink">{referral.title}</div>
                    <Link href={`/admin/users/${referral.profileId}`} className="mt-2 block text-xs font-semibold text-navy">{referral.profile.user.fullName}</Link>
                    <div className="mt-1 text-[11px] text-mute">{referral.profile.user.email}</div>
                    <div className="mt-3 text-[11px] text-mute">Partner: {referral.partner?.name || "No partner"}</div>
                    <div className="mt-1 text-[11px] text-mute">Source: {referral.sourceSessionId ? "Counselor conversation" : String(metadata.source || "Service directory").replaceAll("_", " ")}</div>
                    {referral.externalUrl && <a href={referral.externalUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-navy">Partner route <ExternalLink size={10}/></a>}
                  </div>

                  <div className="rounded-xl bg-paper p-4 text-xs">
                    <div className="font-semibold text-ink">Current state</div>
                    <div className="mt-2 text-mute">{pretty(referral.status)}</div>
                    <div className="mt-3 text-[11px] text-mute">Started {referral.createdAt.toLocaleString()}</div>
                    {referral.convertedAt && <div className="mt-1 text-[11px] text-mute">Converted {referral.convertedAt.toLocaleString()}</div>}
                    {referral.partnerReference && <div className="mt-2 text-[11px] text-mute">Partner ref: {referral.partnerReference}</div>}
                    {referral.revenueAmount !== null && <div className="mt-2 font-semibold text-ink">Revenue: {referral.revenueCurrency || ""} {String(referral.revenueAmount)}</div>}
                    {referral.commissionAmount !== null && <div className="mt-1 font-semibold text-ink">Commission: {referral.commissionCurrency || ""} {String(referral.commissionAmount)}</div>}
                  </div>

                  <form action={updateReferralCommercials.bind(null, referral.id)} className="grid gap-2 sm:grid-cols-2">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-mute">Status<select name="status" defaultValue={referral.status} className="mt-1 w-full rounded-lg border border-hair px-3 py-2 text-xs font-normal normal-case text-ink">{["RECOMMENDED", "OPENED", "STARTED", "COMPLETED", "DECLINED", "EXTERNAL_ONLY"].map((value) => <option key={value} value={value}>{pretty(value)}</option>)}</select></label>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-mute">Partner reference<input name="partnerReference" defaultValue={referral.partnerReference || ""} className="mt-1 w-full rounded-lg border border-hair px-3 py-2 text-xs font-normal normal-case text-ink"/></label>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-mute">Revenue<input name="revenueAmount" inputMode="decimal" defaultValue={referral.revenueAmount !== null ? String(referral.revenueAmount) : ""} className="mt-1 w-full rounded-lg border border-hair px-3 py-2 text-xs font-normal normal-case text-ink"/></label>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-mute">Revenue currency<input name="revenueCurrency" defaultValue={referral.revenueCurrency || ""} placeholder="EUR" className="mt-1 w-full rounded-lg border border-hair px-3 py-2 text-xs font-normal uppercase text-ink"/></label>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-mute">Commission<input name="commissionAmount" inputMode="decimal" defaultValue={referral.commissionAmount !== null ? String(referral.commissionAmount) : ""} className="mt-1 w-full rounded-lg border border-hair px-3 py-2 text-xs font-normal normal-case text-ink"/></label>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-mute">Commission currency<input name="commissionCurrency" defaultValue={referral.commissionCurrency || ""} placeholder="EUR" className="mt-1 w-full rounded-lg border border-hair px-3 py-2 text-xs font-normal uppercase text-ink"/></label>
                    <button className="mt-1 rounded-lg bg-navy px-3 py-2.5 text-xs font-semibold text-white sm:col-span-2">Save referral/commercial record</button>
                  </form>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
