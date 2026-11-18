import Link from "next/link";
import { ArrowLeft, Laptop } from "lucide-react";
import { Header } from "@/components/Header";
import { requireRole } from "@/lib/auth/currentUser";
import { SUPPORT_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

// Same router-cache defense-in-depth as every other admin page — see
// src/app/admin/audit/page.tsx's comment for the full explanation.
export const dynamic = "force-dynamic";

const OUTCOME_STYLE: Record<string, string> = {
  COMPLETED: "bg-[#E3F2E5] text-[#2E7D32]",
  PARTIAL: "bg-[#FFF4CC] text-[#8A6A00]",
  NEEDS_INPUT: "bg-[#E9EEFB] text-[#1F3FA8]",
  ERROR: "bg-[#FDE8DE] text-[#B23C0B]",
};

const RUN_EVENT_STYLE: Record<string, string> = {
  REVIEW: "bg-[#E9EEFB] text-[#1F3FA8]",
  APPROVED: "bg-[#E3F2E5] text-[#2E7D32]",
  PAUSED: "bg-[#FFF4CC] text-[#8A6A00]",
};

// This is the staff-facing side of CompanionFillEvent — written on every
// fill by POST /api/companion/fill-event, previously never read back
// anywhere. Same list pattern as src/app/admin/audit/page.tsx: a plain
// findMany with no pagination library, scoped to a SUPPORT agent's own
// assigned tickets the same way the document-review audit trail is.
export default async function AdminCompanionActivityPage() {
  const current = await requireRole(SUPPORT_ROLES);
  const supportScope = current.user.role === "SUPPORT"
    ? { profile: { supportTickets: { some: { assignedToUserId: current.user.id } } } }
    : {};
  const [fillEvents, runEvents] = await Promise.all([
    prisma.companionFillEvent.findMany({
      where: supportScope,
      include: { device: true, profile: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
    // The run itself (review verdicts, approvals, why it paused) never
    // had any staff visibility before this — companionFillEvents above
    // only ever recorded raw per-page fill counts.
    prisma.companionRunEvent.findMany({
      where: supportScope,
      include: { profile: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
  ]);

  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn role={current.user.role} />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <Link href="/admin" className="inline-flex items-center gap-1 text-xs font-semibold text-navy"><ArrowLeft size={13} />Admin</Link>
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.16em] text-mute">Internal operations</div>
            <h1 className="mt-1 text-2xl font-semibold text-ink">Companion activity</h1>
            <p className="mt-2 text-sm leading-6 text-mute">What SOUP Companion actually did on real application pages — scanned, filled and flagged, by student and device.</p>
          </div>
          <Laptop size={22} className="text-navy" />
        </div>
        <section className="mt-6 overflow-hidden rounded-2xl border border-hair bg-white">
          {fillEvents.length === 0 ? (
            <div className="p-10 text-center text-sm text-mute">No Companion fill activity recorded yet.</div>
          ) : fillEvents.map((event) => (
            <div key={event.id} className="grid gap-3 border-b border-hair p-4 last:border-0 md:grid-cols-[1fr_1fr_.7fr_.9fr] md:items-center">
              <div>
                <div className="text-xs font-semibold text-ink">{event.portalHost}</div>
                <div className="mt-1 truncate text-[11px] text-mute">{event.pageUrl}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-ink">{event.profile.user.fullName}</div>
                <div className="mt-1 text-[11px] text-mute">{event.profile.user.email} · {event.device.label || "SOUP Companion"}</div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-mute">
                <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${OUTCOME_STYLE[event.outcome] || "bg-[#F1F2EE] text-mute"}`}>{event.outcome.replaceAll("_", " ")}</span>
                <span>{event.fieldsFilled}/{event.fieldsDetected} filled{event.fieldsNeedInput > 0 ? `, ${event.fieldsNeedInput} need input` : ""}</span>
              </div>
              <div className="text-xs text-mute md:text-right">{event.createdAt.toLocaleString()}</div>
            </div>
          ))}
        </section>

        <h2 className="mt-10 text-lg font-semibold text-ink">Run activity</h2>
        <p className="mt-1 text-sm leading-6 text-mute">Review verdicts, approvals, and why a multi-application run paused — the fill counts above don't show any of this.</p>
        <section className="mt-4 overflow-hidden rounded-2xl border border-hair bg-white">
          {runEvents.length === 0 ? (
            <div className="p-10 text-center text-sm text-mute">No run activity recorded yet.</div>
          ) : runEvents.map((event) => (
            <div key={event.id} className="grid gap-3 border-b border-hair p-4 last:border-0 md:grid-cols-[.6fr_1fr_1.4fr_.9fr] md:items-center">
              <div>
                <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${RUN_EVENT_STYLE[event.kind] || "bg-[#F1F2EE] text-mute"}`}>{event.kind}</span>
                <div className="mt-1 text-xs font-semibold text-ink">{event.universityName}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-ink">{event.profile.user.fullName}</div>
                <div className="mt-1 text-[11px] text-mute">{event.profile.user.email}</div>
              </div>
              <div className="text-[11px] leading-5 text-mute">{event.detail}</div>
              <div className="text-xs text-mute md:text-right">{event.createdAt.toLocaleString()}</div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
