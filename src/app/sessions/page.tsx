import Link from "next/link";
import { CalendarDays, Video } from "lucide-react";
import { Header } from "@/components/Header";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { requestCounselorSession } from "@/app/actions/sessions";

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in (this app is used on
// shared/school devices) — see the fix and full explanation in
// src/app/actions/auth.ts (invalidateAuthenticatedPages). requireProfile()/
// requireRole() already force dynamic rendering implicitly via cookies(),
// but that is an implicit guarantee a future refactor could silently
// break; this makes it explicit and impossible to regress unnoticed.
export const dynamic = "force-dynamic";

function nice(v:string){return v.toLowerCase().split("_").map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(" ");}
export default async function SessionsPage(){
  const { profile } = await requireProfile();
  const [sessions, concierge] = await Promise.all([
    prisma.counselorSession.findMany({ where:{profileId:profile.id}, include:{counselor:true}, orderBy:{createdAt:"desc"}, take:20 }),
    prisma.payment.findFirst({where:{profileId:profile.id,type:"PREMIUM_COUNSELING",status:"PAID",OR:[{title:"SOUP Concierge"},{metadata:{path:["plan"],equals:"premium_plus"}}]}}),
  ]);
  return <div className="min-h-screen bg-paper"><Header signedIn/><main className="mx-auto max-w-5xl px-5 py-8 sm:px-8"><div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">SOUP Concierge</div><h1 className="mt-1 text-2xl font-semibold text-ink">Counselor sessions</h1><p className="mt-2 text-sm text-mute">Request, confirm and join high-touch counseling sessions from the same student case.</p>
  {!concierge?<section className="mt-6 rounded-2xl border border-hair bg-white p-6"><h2 className="text-sm font-semibold text-ink">Video-session booking is a Concierge feature</h2><p className="mt-2 text-xs leading-5 text-mute">SOUP Concierge includes weekly scheduled counselor sessions and senior case oversight.</p><Link href="/premium" className="mt-4 inline-flex rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white">View SOUP Concierge</Link></section>:<section className="mt-6 grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><form action={requestCounselorSession} className="h-fit rounded-2xl border border-hair bg-white p-5"><div className="flex items-center gap-2"><CalendarDays size={15} className="text-teal"/><h2 className="text-sm font-semibold text-ink">Request a session</h2></div><label className="mt-4 block text-xs font-medium text-ink">Preferred date<input type="date" name="requestedDate" className="mt-1.5 w-full rounded-xl border border-hair px-3 py-2.5 text-sm"/></label><label className="mt-3 block text-xs font-medium text-ink">Preferred time / timezone<input name="requestedTimeNote" placeholder="e.g. 4–7 PM Pakistan time" className="mt-1.5 w-full rounded-xl border border-hair px-3 py-2.5 text-sm"/></label><label className="mt-3 block text-xs font-medium text-ink">What should we cover?<textarea name="studentNote" rows={4} className="mt-1.5 w-full rounded-xl border border-hair px-3 py-2.5 text-sm"/></label><button className="mt-4 w-full rounded-xl bg-navy py-2.5 text-xs font-semibold text-white">Request counselor session</button></form><div className="space-y-3">{sessions.length?sessions.map(s=><article key={s.id} className="rounded-2xl border border-hair bg-white p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-semibold text-ink">{s.scheduledFor?s.scheduledFor.toLocaleString():s.requestedDate?`Preferred ${s.requestedDate.toLocaleDateString()}`:"Time being arranged"}</div><div className="mt-1 text-[11px] text-mute">{s.counselor?.fullName || "SOUP counselor"} · {nice(s.status)}</div></div><span className="rounded-full bg-paper px-2.5 py-1 text-[10px] font-semibold text-mute">{nice(s.status)}</span></div>{s.meetingUrl&&s.status==="SCHEDULED"?<a href={s.meetingUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal px-3 py-2 text-xs font-semibold text-white"><Video size={13}/>Join video call</a>:null}</article>):<div className="rounded-2xl border border-hair bg-white p-8 text-sm text-mute">No sessions requested yet.</div>}</div></section>}
  </main></div>;
}
