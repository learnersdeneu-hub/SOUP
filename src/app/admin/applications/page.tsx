import Link from "next/link";
import { Header } from "@/components/Header";
import { requireRole } from "@/lib/auth/currentUser";
import { APPLICATION_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { ApplicationOperations } from "@/components/admin/ApplicationOperations";
import type { StudentApplicationStatus } from "@prisma/client";

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in (this app is used on
// shared/school devices) — see the fix and full explanation in
// src/app/actions/auth.ts (invalidateAuthenticatedPages). requireProfile()/
// requireRole() already force dynamic rendering implicitly via cookies(),
// but that is an implicit guarantee a future refactor could silently
// break; this makes it explicit and impossible to regress unnoticed.
export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage({ searchParams }: { searchParams: { q?: string; status?: string } }) {
  await requireRole(APPLICATION_ROLES);
  const q = searchParams.q?.trim();
  const rawStatus = searchParams.status?.trim();
  const statuses: StudentApplicationStatus[] = ["SHORTLISTED","DOCUMENTS_REQUIRED","READY_TO_SUBMIT","SUBMITTED","UNDER_REVIEW","OFFER_RECEIVED","CONDITIONAL_OFFER","REJECTED","WITHDRAWN","ENROLLED"];
  const status = statuses.includes(rawStatus as StudentApplicationStatus) ? rawStatus as StudentApplicationStatus : undefined;
  const applications = await prisma.studentApplication.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q ? { OR: [
        { profile: { user: { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } } },
        { university: { name: { contains: q, mode: "insensitive" } } },
        { program: { title: { contains: q, mode: "insensitive" } } },
      ] } : {}),
    },
    include: { profile: { include: { user: true } }, university: true, program: true, offerDocument: true },
    orderBy: { updatedAt: "desc" },
    take: 250,
  });

  return <div className="min-h-screen bg-paper"><Header signedIn/><main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">SOUP operations</div><h1 className="mt-1 text-2xl font-semibold text-ink">Applications & offers</h1><p className="mt-2 text-sm text-mute">Operate partner applications without blurring the boundary with student-managed external applications.</p></div><form className="flex flex-wrap gap-2"><input name="q" defaultValue={q} placeholder="Student, university or program" className="w-64 rounded-xl border border-hair bg-white px-3 py-2.5 text-sm outline-none"/><select name="status" defaultValue={status || ""} className="rounded-xl border border-hair bg-white px-3 py-2.5 text-sm"><option value="">All statuses</option>{["DOCUMENTS_REQUIRED","READY_TO_SUBMIT","SUBMITTED","UNDER_REVIEW","OFFER_RECEIVED","CONDITIONAL_OFFER","REJECTED","ENROLLED"].map((v)=><option key={v} value={v}>{v.replaceAll("_"," ")}</option>)}</select><button className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white">Filter</button></form></div>
    <div className="mt-6 space-y-3">{applications.length === 0 ? <div className="rounded-2xl border border-hair bg-white p-8 text-sm text-mute">No applications match this view.</div> : applications.map((app)=><article key={app.id} className="rounded-2xl border border-hair bg-white p-5"><div className="grid gap-4 lg:grid-cols-[1.1fr_1.2fr_.7fr_1.2fr]"><div><div className="text-sm font-semibold text-ink">{app.profile.user.fullName}</div><div className="mt-1 text-xs text-mute">{app.profile.user.email}</div></div><div><div className="text-sm font-semibold text-ink">{app.university?.name || "University not linked"}</div><div className="mt-1 text-xs text-mute">{app.program?.title || "Program not linked"}</div></div><div><div className="text-[10px] font-semibold uppercase tracking-wide text-mute">Ownership</div><div className="mt-1 text-xs font-semibold text-ink">{app.ownership.replaceAll("_"," ")}</div><div className="mt-1 text-xs text-mute">{app.status.replaceAll("_"," ")}</div>{app.offerDocument && <div className="mt-1 text-[11px] font-semibold text-teal">Offer document stored</div>}</div><div className="space-y-2"><Link href={`/admin/applications/${app.id}`} className="inline-flex rounded-lg bg-navy px-3 py-2 text-[11px] font-semibold text-white">Open case</Link><ApplicationOperations applicationId={app.id} status={app.status} managed={app.ownership === "SOUP_MANAGED"}/></div></div></article>)}</div>
  </main></div>;
}
