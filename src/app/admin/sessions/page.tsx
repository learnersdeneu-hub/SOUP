import { Header } from "@/components/Header";
import { requireRole } from "@/lib/auth/currentUser";
import { CASE_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { scheduleCounselorSession, updateCounselorSessionStatus } from "@/app/actions/sessions";

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
export default async function AdminSessionsPage(){
  await requireRole(CASE_ROLES);
  const sessions=await prisma.counselorSession.findMany({include:{profile:{include:{user:true}},counselor:true},orderBy:[{status:"asc"},{scheduledFor:"asc"},{createdAt:"desc"}],take:100});
  return <div className="min-h-screen bg-paper"><Header signedIn/><main className="mx-auto max-w-6xl px-5 py-8 sm:px-8"><div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">SOUP operations</div><h1 className="mt-1 text-2xl font-semibold text-ink">Counselor sessions</h1><p className="mt-2 text-sm text-mute">Concierge session requests, assignments, meeting links and completion status.</p><div className="mt-6 space-y-3">{sessions.length?sessions.map(s=><article key={s.id} className="rounded-2xl border border-hair bg-white p-5"><div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]"><div><div className="text-sm font-semibold text-ink">{s.profile.user.fullName}</div><div className="mt-1 text-xs text-mute">{s.profile.user.email}</div><div className="mt-2 text-[11px] text-mute">{nice(s.status)} · {s.counselor?.fullName || "Unassigned"}</div>{s.studentNote&&<p className="mt-2 text-[11px] leading-5 text-mute">{s.studentNote}</p>}</div><div>{s.status==="REQUESTED"?<form action={scheduleCounselorSession.bind(null,s.id)} className="grid gap-2 sm:grid-cols-2"><input type="datetime-local" name="scheduledFor" required className="rounded-xl border border-hair px-3 py-2 text-xs"/><input name="meetingUrl" placeholder="https:// meeting link" className="rounded-xl border border-hair px-3 py-2 text-xs"/><input name="staffNote" placeholder="Internal scheduling note" className="rounded-xl border border-hair px-3 py-2 text-xs sm:col-span-2"/><button className="rounded-xl bg-navy px-3 py-2 text-xs font-semibold text-white sm:col-span-2">Confirm and assign to me</button></form>:<div className="flex flex-wrap gap-2"><div className="rounded-xl bg-paper px-3 py-2 text-xs text-ink">{s.scheduledFor?.toLocaleString() || "No confirmed time"}</div>{s.status==="SCHEDULED"?<><form action={updateCounselorSessionStatus.bind(null,s.id,"COMPLETED")}><button className="rounded-xl bg-teal px-3 py-2 text-xs font-semibold text-white">Mark completed</button></form><form action={updateCounselorSessionStatus.bind(null,s.id,"NO_SHOW")}><button className="rounded-xl border border-hair px-3 py-2 text-xs font-semibold text-ink">No show</button></form><form action={updateCounselorSessionStatus.bind(null,s.id,"CANCELLED")}><button className="rounded-xl border border-hair px-3 py-2 text-xs font-semibold text-ink">Cancel</button></form></>:null}</div>}</div></div></article>):<div className="rounded-2xl border border-hair bg-white p-8 text-sm text-mute">No counselor sessions yet.</div>}</div></main></div>;
}
