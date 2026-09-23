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

function stage(value?: string | null) {
  return value ? value.replaceAll("_", " ") : "EXPLORING";
}

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string } }) {
  const current = await requireRole(CASE_ROLES);
  const q = searchParams.q?.trim();
  const supportScope = current.user.role === "SUPPORT"
    ? { profile: { supportTickets: { some: { assignedToUserId: current.user.id } } } }
    : {};
  const users = await prisma.user.findMany({
    where: { ...supportScope, ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { fullName: { contains: q, mode: "insensitive" } }] } : {}) },
    include: { profile: { include: { studentCase: true, _count: { select: { documents: true, studentApplications: true, universityShortlists: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return <div className="min-h-screen bg-paper"><Header signedIn /><main className="mx-auto max-w-6xl px-5 py-8 sm:px-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">SOUP operations</div><h1 className="mt-1 text-2xl font-semibold text-ink">Student & user cases</h1><p className="mt-2 text-sm text-mute">Open one student to see their entire SOUP journey rather than separate disconnected records.</p></div><form><input name="q" defaultValue={q} placeholder="Search name or email" className="w-full rounded-xl border border-hair bg-white px-4 py-2.5 text-sm outline-none sm:w-72" /></form></div><div className="mt-6 overflow-hidden rounded-2xl border border-hair bg-white"><div className="grid grid-cols-[1.3fr_1fr_.8fr_.7fr] gap-3 border-b border-hair bg-[#FAFAFA] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-mute"><div>Student / user</div><div>Journey</div><div>Case data</div><div>Joined</div></div>{users.map((item) => <div key={item.id} className="grid grid-cols-[1.3fr_1fr_.8fr_.7fr] gap-3 border-b border-hair px-4 py-3 text-xs last:border-0"><div><Link href={item.profile ? `/admin/users/${item.profile.id}` : "/admin/users"} className="font-medium text-ink hover:text-navy">{item.fullName}</Link><div className="mt-1 text-mute">{item.email}</div></div><div><div className="font-medium text-ink">{stage(item.profile?.studentCase?.stage)}</div><div className="mt-1 text-mute">{item.profile?.studentCase?.targetSubject || item.role}</div></div><div className="text-mute">{item.profile ? `${item.profile._count.studentApplications} apps · ${item.profile._count.documents} docs · ${item.profile._count.universityShortlists} plans` : "Profile missing"}</div><div className="text-mute">{item.createdAt.toLocaleDateString()}</div></div>)}</div></main></div>;
}
