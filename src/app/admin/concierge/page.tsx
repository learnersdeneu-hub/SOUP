import Link from "next/link";
import { Header } from "@/components/Header";
import { requireRole } from "@/lib/auth/currentUser";
import { CASE_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in (this app is used on
// shared/school devices) — see the fix and full explanation in
// src/app/actions/auth.ts (invalidateAuthenticatedPages). requireProfile()/
// requireRole() already force dynamic rendering implicitly via cookies(),
// but that is an implicit guarantee a future refactor could silently
// break; this makes it explicit and impossible to regress unnoticed.
export const dynamic = "force-dynamic";

export default async function ConciergeQueuePage(){
  await requireRole(CASE_ROLES);
  const payments = await prisma.payment.findMany({ where:{type:"PREMIUM_COUNSELING",status:"PAID",OR:[{title:"SOUP Concierge"},{metadata:{path:["plan"],equals:"premium_plus"}}]}, include:{profile:{include:{user:true,studentCase:true}}}, orderBy:{paidAt:"desc"}, take:100 });
  return <div className="min-h-screen bg-paper"><Header signedIn/><main className="mx-auto max-w-6xl px-5 py-8 sm:px-8"><div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">SOUP Concierge</div><h1 className="mt-1 text-2xl font-semibold text-ink">Priority case queue</h1><p className="mt-2 text-sm text-mute">High-touch cases that need named ownership, weekly review and proactive follow-up.</p><div className="mt-6 space-y-3">{payments.length?payments.map((p)=><article key={p.id} className="rounded-2xl border border-hair bg-white p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><div className="text-sm font-semibold text-ink">{p.profile.user.fullName}</div><div className="mt-1 text-xs text-mute">{p.profile.user.email} · {p.profile.studentCase?.stage?.replaceAll("_"," ") || "Case not started"}</div><div className="mt-2 text-[11px] text-mute">Counselor: {p.profile.studentCase?.assignedStaffUserId ? "Assigned" : "Needs assignment"} · Next: {p.profile.studentCase?.nextAction || "Review case and set weekly plan"}</div></div><Link href={`/admin/users/${p.profileId}`} className="rounded-xl bg-navy px-3 py-2 text-xs font-semibold text-white">Open case</Link></div></article>):<div className="rounded-2xl border border-hair bg-white p-8 text-sm text-mute">No active Concierge customers yet.</div>}</div></main></div>
}
