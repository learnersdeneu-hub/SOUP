import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { updatePartner } from "@/app/actions/partners";
import { requireRole } from "@/lib/auth/currentUser";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export default async function PartnerDetailPage({ params }: { params: { id: string } }) {
  await requireRole(ADMIN_ROLES);
  const partner = await prisma.partner.findUnique({
    where: { id: params.id },
    include: { _count: { select: { universities: true, referrals: true } } },
  });
  if (!partner) notFound();
  const save = updatePartner.bind(null, partner.id);

  return <div className="min-h-screen bg-paper"><Header signedIn/><main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
    <Link href="/admin/partners" className="text-sm font-semibold text-navy">← Partner catalog</Link>
    <div className="mt-5 rounded-[28px] border border-hair bg-white p-6 shadow-soft">
      <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">SOUP partner operations</div>
      <h1 className="mt-1 text-2xl font-semibold text-ink">{partner.name}</h1>
      <p className="mt-2 text-sm leading-6 text-mute">{partner.type.replaceAll("_", " ")} · {partner._count.universities} university record(s) · {partner._count.referrals} referral(s)</p>
      <p className="mt-3 rounded-xl bg-[#FAFAFA] px-4 py-3 text-xs leading-5 text-mute">Internal priority changes ordering among otherwise relevant SOUP partners. It must never be presented to a student as academic suitability or a match score.</p>

      <form action={save} className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-ink">Status<select name="status" defaultValue={partner.status} className="mt-1 w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-sm">{["ACTIVE","PAUSED","INACTIVE"].map((value)=><option key={value} value={value}>{value}</option>)}</select></label>
        <label className="text-sm font-medium text-ink">Internal priority<input name="internalPriority" type="number" min="0" max="10000" defaultValue={partner.internalPriority} className="mt-1 w-full rounded-xl border border-hair px-3 py-2.5 text-sm"/></label>
        <label className="text-sm font-medium text-ink">Country<input name="country" defaultValue={partner.country || ""} className="mt-1 w-full rounded-xl border border-hair px-3 py-2.5 text-sm"/></label>
        <label className="text-sm font-medium text-ink">City<input name="city" defaultValue={partner.city || ""} className="mt-1 w-full rounded-xl border border-hair px-3 py-2.5 text-sm"/></label>
        <label className="text-sm font-medium text-ink sm:col-span-2">Website URL<input name="websiteUrl" type="url" defaultValue={partner.websiteUrl || ""} placeholder="https://..." className="mt-1 w-full rounded-xl border border-hair px-3 py-2.5 text-sm"/></label>
        <label className="text-sm font-medium text-ink sm:col-span-2">SOUP transaction / referral URL<input name="transactionUrl" type="url" defaultValue={partner.transactionUrl || ""} placeholder="https://..." className="mt-1 w-full rounded-xl border border-hair px-3 py-2.5 text-sm"/><span className="mt-1 block text-xs font-normal text-mute">Required for active non-university services. Independent recommendations never use this route.</span></label>
        <div className="sm:col-span-2"><button className="rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white">Save partner</button></div>
      </form>
    </div>
  </main></div>;
}
