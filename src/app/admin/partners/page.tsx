import Link from "next/link";
import { Header } from "@/components/Header";
import { createServicePartner } from "@/app/actions/partners";
import { requireRole } from "@/lib/auth/currentUser";
import { STAFF_ROLES } from "@/lib/auth/roles";
import type { AppRole, PartnerType, PartnershipStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 100;
const PARTNER_TYPES = ["UNIVERSITY","ACCOMMODATION","INSURANCE","STUDENT_FINANCE","SCHOLARSHIP","TRAVEL","OTHER"] as const satisfies readonly PartnerType[];
const PARTNER_STATUSES = ["ACTIVE","PAUSED","INACTIVE"] as const satisfies readonly PartnershipStatus[];

export default async function AdminPartnersPage({ searchParams }: { searchParams: { q?: string; type?: string; status?: string; page?: string } }) {
  const current = await requireRole(STAFF_ROLES as AppRole[]);
  const q = searchParams.q?.trim();
  const requestedType = searchParams.type?.trim();
  const requestedStatus = searchParams.status?.trim();
  const type = PARTNER_TYPES.includes(requestedType as PartnerType) ? requestedType as PartnerType : undefined;
  const status = PARTNER_STATUSES.includes(requestedStatus as PartnershipStatus) ? requestedStatus as PartnershipStatus : undefined;
  const requestedPage = Math.max(1, Number(searchParams.page || "1") || 1);
  const where: Prisma.PartnerWhereInput = {
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
  };
  const total = await prisma.partner.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const partners = await prisma.partner.findMany({
    where,
    include: { _count: { select: { universities: true, referrals: true } } },
    orderBy: [{ status: "asc" }, { internalPriority: "asc" }, { name: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const canManage = ["ADMIN", "SUPER_ADMIN"].includes(current.user.role);
  const paramsForPage = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    params.set("page", String(nextPage));
    return `/admin/partners?${params.toString()}`;
  };

  return <div className="min-h-screen bg-paper"><Header signedIn/><main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">SOUP commercial inventory</div><h1 className="mt-1 text-2xl font-semibold text-ink">Partner catalog</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-mute">Noodles can prioritize active partners only after suitability is established. This catalog controls which services may be transacted through SOUP.</p></div><form className="flex flex-wrap gap-2"><input name="q" defaultValue={q} placeholder="Search partner" className="w-52 rounded-xl border border-hair bg-white px-3 py-2.5 text-sm"/><select name="type" defaultValue={type || ""} className="rounded-xl border border-hair bg-white px-3 py-2.5 text-sm"><option value="">All types</option>{PARTNER_TYPES.map((v)=><option key={v} value={v}>{v.replaceAll("_"," ")}</option>)}</select><select name="status" defaultValue={status || ""} className="rounded-xl border border-hair bg-white px-3 py-2.5 text-sm"><option value="">All statuses</option>{PARTNER_STATUSES.map((v)=><option key={v} value={v}>{v}</option>)}</select><button className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white">Filter</button></form></div>

    {canManage && <details className="mt-6 rounded-2xl border border-hair bg-white p-5"><summary className="cursor-pointer text-sm font-semibold text-ink">Add a service partner</summary><p className="mt-2 text-xs leading-5 text-mute">Use the bulk university catalog importer for universities/programs. This form is for accommodation, insurance, finance, scholarship, travel and other transactional partners.</p><form action={createServicePartner} className="mt-4 grid gap-3 sm:grid-cols-2"><input name="name" required placeholder="Partner name" className="rounded-xl border border-hair px-3 py-2.5 text-sm"/><select name="type" required className="rounded-xl border border-hair bg-white px-3 py-2.5 text-sm">{PARTNER_TYPES.filter((v)=>v!=="UNIVERSITY").map((v)=><option key={v} value={v}>{v.replaceAll("_"," ")}</option>)}</select><input name="country" placeholder="Country" className="rounded-xl border border-hair px-3 py-2.5 text-sm"/><input name="city" placeholder="City" className="rounded-xl border border-hair px-3 py-2.5 text-sm"/><input name="websiteUrl" type="url" placeholder="Website https://..." className="rounded-xl border border-hair px-3 py-2.5 text-sm"/><input name="transactionUrl" type="url" required placeholder="Transaction/referral https://..." className="rounded-xl border border-hair px-3 py-2.5 text-sm"/><input name="internalPriority" type="number" min="0" max="10000" defaultValue="100" className="rounded-xl border border-hair px-3 py-2.5 text-sm"/><div><button className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white">Add active partner</button></div></form></details>}

    <div className="mt-6 flex items-center justify-between text-xs text-mute"><span>{total} partner{total === 1 ? "" : "s"} · page {page} of {totalPages}</span><span>Showing up to {PAGE_SIZE} per page</span></div>
    <div className="mt-3 overflow-hidden rounded-2xl border border-hair bg-white"><div className="grid grid-cols-[1.4fr_.7fr_.7fr_.7fr] gap-3 border-b border-hair bg-[#FAFAFA] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-mute"><div>Partner</div><div>Type</div><div>Status</div><div>Inventory / referrals</div></div>{partners.map((partner)=><div key={partner.id} className="grid grid-cols-[1.4fr_.7fr_.7fr_.7fr] gap-3 border-b border-hair px-4 py-3 text-xs last:border-0"><div><div className="font-semibold text-ink">{partner.name}</div><div className="mt-1 text-mute">{[partner.city,partner.country].filter(Boolean).join(", ") || "Global / not specified"}</div><div className="mt-1 flex flex-wrap gap-3">{partner.transactionUrl && <a href={partner.transactionUrl} target="_blank" rel="noreferrer" className="font-semibold text-navy">Transaction route ↗</a>}{canManage && <Link href={`/admin/partners/${partner.id}`} className="font-semibold text-teal">Manage</Link>}</div></div><div className="text-ink">{partner.type.replaceAll("_"," ")}</div><div className="font-semibold text-ink">{partner.status}</div><div className="text-mute">{partner._count.universities} universities · {partner._count.referrals} referrals</div></div>)}</div>
    <div className="mt-4 flex justify-end gap-2">{page > 1 && <Link href={paramsForPage(page - 1)} className="rounded-xl border border-hair bg-white px-4 py-2 text-sm font-semibold text-navy">Previous</Link>}{page < totalPages && <Link href={paramsForPage(page + 1)} className="rounded-xl border border-hair bg-white px-4 py-2 text-sm font-semibold text-navy">Next</Link>}</div>
  </main></div>;
}
