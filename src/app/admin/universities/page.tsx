import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Header } from "@/components/Header";
import { createUniversity } from "@/app/actions/universities";
import { requireRole } from "@/lib/auth/currentUser";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

// Same router-cache defense-in-depth as every other admin page — see
// src/app/admin/partners/page.tsx's comment for the full explanation.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function AdminUniversitiesPage({ searchParams: searchParamsPromise }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const searchParams = await searchParamsPromise;
  const current = await requireRole(ADMIN_ROLES);
  const q = searchParams.q?.trim();
  const requestedPage = Math.max(1, Number(searchParams.page || "1") || 1);
  const where: Prisma.UniversityWhereInput = q ? { name: { contains: q, mode: "insensitive" } } : {};

  const total = await prisma.university.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const universities = await prisma.university.findMany({
    where,
    include: { partner: { select: { status: true } }, _count: { select: { programs: true } } },
    orderBy: [{ name: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const paramsForPage = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(nextPage));
    return `/admin/universities?${params.toString()}`;
  };

  return <div className="min-h-screen bg-paper"><Header signedIn role={current.user.role}/><main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">SOUP university catalog</div>
        <h1 className="mt-1 text-2xl font-semibold text-ink">University catalog</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-mute">Add, edit or retire universities and programs directly — no script or Claude Code session needed. Toggling &quot;SOUP manages applications&quot; is what actually turns a university into a SOUP-managed apply target; everything else is catalog data shown to students.</p>
      </div>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search university" className="w-56 rounded-xl border border-hair bg-white px-3 py-2.5 text-sm"/>
        <button className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white">Search</button>
      </form>
    </div>

    <details className="mt-6 rounded-2xl border border-hair bg-white p-5">
      <summary className="cursor-pointer text-sm font-semibold text-ink">Add a university</summary>
      <form action={createUniversity} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input name="name" required placeholder="University name" className="rounded-xl border border-hair px-3 py-2.5 text-sm"/>
        <input name="country" required placeholder="Country" className="rounded-xl border border-hair px-3 py-2.5 text-sm"/>
        <input name="city" placeholder="City" className="rounded-xl border border-hair px-3 py-2.5 text-sm"/>
        <input name="websiteUrl" type="url" placeholder="Website https://..." className="rounded-xl border border-hair px-3 py-2.5 text-sm"/>
        <input name="logoUrl" type="url" placeholder="Logo image URL (optional)" className="rounded-xl border border-hair px-3 py-2.5 text-sm sm:col-span-2"/>
        <label className="flex items-center gap-2 text-sm text-ink"><input name="visible" type="checkbox" defaultChecked className="h-4 w-4"/>Show in the student-facing catalog</label>
        <label className="flex items-center gap-2 text-sm text-ink"><input name="manageApplications" type="checkbox" className="h-4 w-4"/>SOUP manages applications here</label>
        <div className="sm:col-span-2"><button className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white">Add university</button></div>
      </form>
    </details>

    <div className="mt-6 flex items-center justify-between text-xs text-mute"><span>{total} universit{total === 1 ? "y" : "ies"} · page {page} of {totalPages}</span><span>Showing up to {PAGE_SIZE} per page</span></div>
    <div className="mt-3 overflow-hidden rounded-2xl border border-hair bg-white">
      <div className="grid grid-cols-[1.4fr_.6fr_.7fr_.6fr] gap-3 border-b border-hair bg-[#FAFAFA] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-mute">
        <div>University</div><div>Programs</div><div>Applications</div><div>Visible</div>
      </div>
      {universities.map((university) => (
        <div key={university.id} className="grid grid-cols-[1.4fr_.6fr_.7fr_.6fr] gap-3 border-b border-hair px-4 py-3 text-xs last:border-0">
          <div>
            <div className="font-semibold text-ink">{university.name}</div>
            <div className="mt-1 text-mute">{[university.city, university.country].filter(Boolean).join(", ")}</div>
            <Link href={`/admin/universities/${university.id}`} className="mt-1 inline-block font-semibold text-teal">Manage</Link>
          </div>
          <div className="text-ink">{university._count.programs}</div>
          <div className="font-semibold text-ink">{university.partner ? university.partner.status : "Not SOUP-managed"}</div>
          <div className="text-ink">{university.isPublic === false ? "Hidden" : "Visible"}</div>
        </div>
      ))}
      {universities.length === 0 && <div className="px-4 py-8 text-center text-sm text-mute">No universities match this search.</div>}
    </div>
    <div className="mt-4 flex justify-end gap-2">
      {page > 1 && <Link href={paramsForPage(page - 1)} className="rounded-xl border border-hair bg-white px-4 py-2 text-sm font-semibold text-navy">Previous</Link>}
      {page < totalPages && <Link href={paramsForPage(page + 1)} className="rounded-xl border border-hair bg-white px-4 py-2 text-sm font-semibold text-navy">Next</Link>}
    </div>
  </main></div>;
}
