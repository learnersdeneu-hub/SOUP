import Link from "next/link";
import { Activity, ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { requireRole } from "@/lib/auth/currentUser";
import { SUPPORT_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export default async function AdminAuditPage() {
  const current = await requireRole(SUPPORT_ROLES);
  const supportScope = current.user.role === "SUPPORT"
    ? { profile: { supportTickets: { some: { assignedToUserId: current.user.id } } } }
    : {};
  const documentEvents = await prisma.documentReviewEvent.findMany({
    where: supportScope,
    include: { actor: true, document: true, profile: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <Link href="/admin" className="inline-flex items-center gap-1 text-xs font-semibold text-navy"><ArrowLeft size={13}/>Admin</Link>
        <div className="mt-4 flex items-end justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-[.16em] text-mute">Internal operations</div><h1 className="mt-1 text-2xl font-semibold text-ink">Audit trail</h1><p className="mt-2 text-sm leading-6 text-mute">Sprint 1 exposes the real document-review audit records already persisted by Passport. Core access/case audit logs remain separate and are not duplicated here.</p></div><Activity size={22} className="text-navy"/></div>
        <section className="mt-6 overflow-hidden rounded-2xl border border-hair bg-white">
          {documentEvents.length === 0 ? <div className="p-10 text-center text-sm text-mute">No document review actions have been recorded yet.</div> : documentEvents.map((event) => (
            <div key={event.id} className="grid gap-3 border-b border-hair p-4 last:border-0 md:grid-cols-[1fr_1.2fr_.8fr_.8fr] md:items-center">
              <div><div className="text-xs font-semibold text-ink">{event.action.replaceAll("_", " ")}</div><div className="mt-1 text-[11px] text-mute">{event.actor.fullName}</div></div>
              <div><div className="text-xs font-medium text-ink">{event.document.originalFileName || event.document.documentType}</div><div className="mt-1 text-[11px] text-mute">{event.profile.user.fullName} · {event.profile.user.email}</div></div>
              <div className="text-xs leading-5 text-mute">{event.reason || "No reason recorded"}</div>
              <div className="text-xs text-mute md:text-right">{event.createdAt.toLocaleString()}</div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
