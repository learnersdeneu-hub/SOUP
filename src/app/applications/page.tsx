import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Header } from "@/components/Header";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { OpenDocumentButton } from "@/components/documents/OpenDocumentButton";
import { deadlineUrgency } from "@/lib/applications/lifecycle";

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in (this app is used on
// shared/school devices) — see the fix and full explanation in
// src/app/actions/auth.ts (invalidateAuthenticatedPages). requireProfile()/
// requireRole() already force dynamic rendering implicitly via cookies(),
// but that is an implicit guarantee a future refactor could silently
// break; this makes it explicit and impossible to regress unnoticed.
export const dynamic = "force-dynamic";

function nice(value: string) { return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }

export default async function ApplicationsPage() {
  const { profile } = await requireProfile();
  const applications = await prisma.studentApplication.findMany({ where: { profileId: profile.id }, orderBy: { updatedAt: "desc" }, include: { university: true, program: true, offerDocument: true } });
  return <div className="min-h-screen bg-paper"><Header signedIn/><main className="mx-auto max-w-5xl px-5 py-8 sm:px-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">My SOUP</div><h1 className="mt-1 text-2xl font-semibold text-ink">Applications</h1><p className="mt-2 text-sm text-mute">SOUP-managed applications and student-managed external applications stay clearly separated.</p></div><Link href="/counselor?intent=universities" className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white">Find universities</Link></div><div className="mt-6 space-y-3">{applications.length === 0 ? <div className="rounded-2xl border border-hair bg-white p-6 text-sm text-mute">No applications have been started yet. Choose a university from a saved plan or ask the Counselor what to do next.</div> : applications.map((app) => { const urgency = deadlineUrgency(app.deadlineAt); return <div key={app.id} className="rounded-2xl border border-hair bg-white p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="text-sm font-semibold text-ink">{app.university?.name || "University application"}</div>{app.program && <div className="mt-1 text-xs text-mute">{app.program.title} · {app.program.level}</div>}<div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-[#EAF0F5] px-2 py-1 text-[10px] font-semibold text-navy">{nice(app.status)}</span><span className="rounded-full bg-paper px-2 py-1 text-[10px] font-semibold text-mute">{app.ownership === "SOUP_MANAGED" ? "SOUP-managed" : app.ownership === "STUDENT_MANAGED_EXTERNAL" ? "External / student-managed" : "Assisted external"}</span></div></div><div className="flex flex-wrap gap-2"><Link href={`/applications/${app.id}`} className="rounded-xl bg-navy px-3 py-2 text-xs font-semibold text-white">Open application</Link>{app.offerDocument && <OpenDocumentButton documentId={app.offerDocument.id}/>} {app.externalApplicationUrl && <a href={app.externalApplicationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-hair px-3 py-2 text-xs font-semibold text-ink">Official application <ExternalLink size={11}/></a>}</div></div>{app.offerDocument && <div className="mt-4 rounded-xl bg-[#F0F7F5] px-3 py-2 text-xs text-teal">Your offer letter is stored in the SOUP document vault. Noodles can use the recorded offer status to guide your next stage.</div>}<div className="mt-3 flex flex-wrap gap-3 text-[10px] text-mute"><span>{app.intake || app.program?.intake || "Intake not confirmed"}</span><span>{urgency.label}</span>{app.externalReference && <span>Ref: {app.externalReference}</span>}</div></div>;})}</div></main></div>;
}
