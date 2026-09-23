import Link from "next/link";
import { ArrowLeft, BedDouble, BriefcaseBusiness, FileText, GraduationCap, ListChecks, MessageSquareText, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Header } from "@/components/Header";
import { requireRole } from "@/lib/auth/currentUser";
import { CASE_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { addInternalUserNote, addStudentAlert } from "@/app/actions/support";
import { updateUserRole } from "@/app/actions/userRoles";

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in (this app is used on
// shared/school devices) — see the fix and full explanation in
// src/app/actions/auth.ts (invalidateAuthenticatedPages). requireProfile()/
// requireRole() already force dynamic rendering implicitly via cookies(),
// but that is an implicit guarantee a future refactor could silently
// break; this makes it explicit and impossible to regress unnoticed.
export const dynamic = "force-dynamic";

function pretty(value?: string | null) {
  return value ? value.replaceAll("_", " ") : "—";
}

export default async function AdminUserDetailPage({ params }: { params: { profileId: string } }) {
  const current = await requireRole(CASE_ROLES);
  if (current.user.role === "SUPPORT") {
    const allowed = await prisma.supportTicket.findFirst({
      where: { profileId: params.profileId, assignedToUserId: current.user.id },
      select: { id: true },
    });
    if (!allowed) throw new Error("This student is not assigned to your support queue.");
  }

  const profile = await prisma.profile.findUniqueOrThrow({
    where: { id: params.profileId },
    include: {
      user: true,
      studentCase: true,
      documents: { orderBy: { uploadedAt: "desc" }, take: 30 },
      studentApplications: { include: { university: true, program: true, offerDocument: true, events: { orderBy: { createdAt: "desc" }, take: 20 } }, orderBy: { updatedAt: "desc" }, take: 30 },
      universityShortlists: { include: { _count: { select: { items: true } } }, orderBy: { generatedAt: "desc" }, take: 10 },
      journeyChecklists: { include: { items: true }, orderBy: { updatedAt: "desc" }, take: 10 },
      serviceReferrals: { include: { partner: true }, orderBy: { updatedAt: "desc" }, take: 20 },
      chatSessions: { orderBy: { updatedAt: "desc" }, take: 15 },
      supportTickets: { orderBy: { updatedAt: "desc" }, take: 10 },
      internalNotes: { include: { authoredBy: true }, orderBy: { createdAt: "desc" }, take: 30 },
      notifications: { orderBy: { createdAt: "desc" }, take: 30 },
      payments: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });

  const studentCase = profile.studentCase;
  const offers = profile.studentApplications.filter((app) => app.status === "OFFER_RECEIVED" || app.status === "CONDITIONAL_OFFER");
  const openJourney = profile.journeyChecklists.flatMap((list) => list.items).filter((item) => !["COMPLETE", "NOT_APPLICABLE"].includes(item.status));
  const canManageRoles = ["ADMIN", "SUPER_ADMIN"].includes(current.user.role);
  const canManageTargetRole = current.user.role === "SUPER_ADMIN" || !["ADMIN", "SUPER_ADMIN"].includes(profile.user.role);
  const assignableRoles = current.user.role === "SUPER_ADMIN"
    ? ["CUSTOMER", "COUNSELOR", "ADMISSIONS", "FINANCE", "ACCOMMODATION", "SUPPORT", "ADMIN", "SUPER_ADMIN"]
    : ["CUSTOMER", "COUNSELOR", "ADMISSIONS", "FINANCE", "ACCOMMODATION", "SUPPORT"];

  const caseTimeline = [
    ...profile.studentApplications.flatMap((app) => app.events.map((event) => ({
      id: `app-${event.id}`,
      at: event.createdAt,
      title: event.message,
      meta: `${app.university?.name || "Application"} · ${pretty(event.eventType)}`,
    }))),
    ...profile.notifications.map((item) => ({ id: `notification-${item.id}`, at: item.createdAt, title: item.title, meta: item.body })),
    ...profile.payments.map((payment) => ({ id: `payment-${payment.id}`, at: payment.createdAt, title: payment.title, meta: `Payment · ${pretty(payment.status)} · ${payment.currency} ${String(payment.amount)}` })),
    ...profile.supportTickets.map((ticket) => ({ id: `support-${ticket.id}`, at: ticket.updatedAt, title: ticket.subject, meta: `Support · ${pretty(ticket.status)}` })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 30);

  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn/>
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <Link href="/admin/users" className="inline-flex items-center gap-1 text-xs font-semibold text-navy"><ArrowLeft size={13}/>Student cases</Link>

        <section className="mt-4 rounded-2xl border border-hair bg-white p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[.14em] text-teal">Student case · {pretty(studentCase?.stage || "EXPLORING")}</div>
              <h1 className="mt-1 text-2xl font-semibold text-ink">{profile.user.fullName}</h1>
              <div className="mt-1 text-sm text-mute">{profile.user.email} · {[profile.user.nationality, profile.user.currentCountry].filter(Boolean).join(" · ") || "Location not recorded"}</div>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <div className="rounded-xl bg-[#F7F8FA] px-4 py-3 text-xs text-mute">Joined {profile.user.createdAt.toLocaleDateString()}<br/>{profile.user.accountStatus} · {pretty(profile.user.role)}</div>
              {canManageRoles && canManageTargetRole ? (
                <form action={updateUserRole.bind(null, profile.user.id)} className="flex items-center gap-2">
                  <select name="role" defaultValue={profile.user.role} className="rounded-lg border border-hair bg-white px-3 py-2 text-xs text-ink">
                    {assignableRoles.map((role) => <option key={role} value={role}>{pretty(role)}</option>)}
                  </select>
                  <button className="rounded-lg border border-hair bg-white px-3 py-2 text-xs font-semibold text-navy">Update role</button>
                </form>
              ) : canManageRoles ? (
                <div className="text-[10px] text-mute">Only a Super Admin can change Admin-level roles.</div>
              ) : null}
            </div>
          </div>

          {studentCase && (
            <>
              <div className="mt-5 grid gap-3 border-t border-hair pt-5 sm:grid-cols-4">
                <div><div className="text-[10px] font-semibold uppercase tracking-wide text-mute">Target</div><div className="mt-1 text-xs font-medium text-ink">{studentCase.targetDegreeLevel || "—"} {studentCase.targetSubject ? `· ${studentCase.targetSubject}` : ""}</div></div>
                <div><div className="text-[10px] font-semibold uppercase tracking-wide text-mute">Region / countries</div><div className="mt-1 text-xs font-medium text-ink">{studentCase.searchScope || "—"}</div></div>
                <div><div className="text-[10px] font-semibold uppercase tracking-wide text-mute">Intake</div><div className="mt-1 text-xs font-medium text-ink">{studentCase.preferredIntake || "—"}</div></div>
                <div><div className="text-[10px] font-semibold uppercase tracking-wide text-mute">Next action</div><div className="mt-1 text-xs font-medium text-ink">{studentCase.nextAction || "Continue with Counselor"}</div></div>
              </div>
              <div className="mt-4 grid gap-3 border-t border-hair pt-4 sm:grid-cols-3">
                <div><div className="text-[10px] font-semibold uppercase tracking-wide text-mute">Academic route</div><div className="mt-1 text-xs leading-5 text-ink">{studentCase.academicBackgroundSummary || "Not yet summarized"}</div></div>
                <div><div className="text-[10px] font-semibold uppercase tracking-wide text-mute">English</div><div className="mt-1 text-xs leading-5 text-ink">{studentCase.englishProficiencySummary || "Not yet summarized"}</div></div>
                <div><div className="text-[10px] font-semibold uppercase tracking-wide text-mute">Funding</div><div className="mt-1 text-xs leading-5 text-ink">{studentCase.fundingSummary || "Not yet summarized"}</div></div>
              </div>
              {studentCase.humanHandoffActive && <div className="mt-4 rounded-xl bg-[#F0F7F5] px-4 py-3 text-xs font-semibold text-teal">Human Counselor handoff active{studentCase.handoffReason ? ` · ${studentCase.handoffReason}` : ""}</div>}
            </>
          )}
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {([
            ["Applications", profile.studentApplications.length, BriefcaseBusiness],
            ["Offers", offers.length, GraduationCap],
            ["Documents", profile.documents.length, FileText],
            ["Plans", profile.universityShortlists.length, GraduationCap],
            ["Open journey", openJourney.length, ListChecks],
            ["Conversations", profile.chatSessions.length, MessageSquareText],
          ] satisfies Array<[string, number, LucideIcon]>).map(([label, value, Icon]) => <div key={label} className="rounded-2xl border border-hair bg-white p-4"><Icon size={15} className="text-navy"/><div className="mt-3 text-2xl font-semibold text-ink">{value}</div><div className="text-xs text-mute">{label}</div></div>)}
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-hair bg-white p-5">
              <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-ink">Applications</h2><Link href="/admin/applications" className="text-xs font-semibold text-navy">Open operations →</Link></div>
              <div className="mt-3 divide-y divide-hair">
                {profile.studentApplications.length === 0 ? <p className="py-4 text-xs text-mute">No applications yet.</p> : profile.studentApplications.map((app) => (
                  <div key={app.id} className="flex flex-col justify-between gap-2 py-3 sm:flex-row">
                    <div><div className="text-xs font-semibold text-ink">{app.university?.name || "University"}</div><div className="mt-1 text-[11px] text-mute">{app.program?.title || "Program"} · {pretty(app.ownership)}</div></div>
                    <div className="text-[11px] font-semibold text-mute">{pretty(app.status)}{app.offerDocument ? " · offer stored" : ""}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-hair bg-white p-5">
              <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-ink">Recent documents</h2><Link href="/admin/documents" className="text-xs font-semibold text-navy">Document operations →</Link></div>
              <div className="mt-3 divide-y divide-hair">
                {profile.documents.length === 0 ? <p className="py-4 text-xs text-mute">No documents.</p> : profile.documents.slice(0, 12).map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between gap-3 py-3 text-xs">
                    <div className="min-w-0"><div className="truncate font-medium text-ink">{doc.originalFileName || doc.documentType}</div><div className="mt-1 text-mute">{pretty(doc.documentType)} · {doc.uploadedAt.toLocaleDateString()}</div></div>
                    <div className="shrink-0 text-mute">{pretty(doc.reviewStatus)}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-hair bg-white p-5">
              <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-ink">Journey & service activity</h2><Link href="/admin/referrals" className="text-xs font-semibold text-navy">Referral operations →</Link></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {profile.journeyChecklists.map((list) => <div key={list.id} className="rounded-xl border border-hair p-4"><div className="flex items-center gap-2 text-xs font-semibold text-ink"><ListChecks size={13}/>{list.title}</div><div className="mt-2 text-[11px] text-mute">{list.items.filter((item) => ["COMPLETE", "DOCUMENT_UPLOADED", "NOT_APPLICABLE"].includes(item.status)).length}/{list.items.length} supplied or complete</div></div>)}
                {profile.serviceReferrals.map((referral) => <div key={referral.id} className="rounded-xl border border-hair p-4"><div className="flex items-center gap-2 text-xs font-semibold text-ink">{referral.type === "INSURANCE" ? <ShieldCheck size={13}/> : referral.type === "ACCOMMODATION" ? <BedDouble size={13}/> : <BriefcaseBusiness size={13}/>}<span>{referral.title}</span></div><div className="mt-2 text-[11px] text-mute">{referral.partner?.name || "External guidance"} · {pretty(referral.status)}</div></div>)}
              </div>
              {!profile.journeyChecklists.length && !profile.serviceReferrals.length && <p className="mt-3 text-xs text-mute">No journey or partner-service activity yet.</p>}
            </section>

            <section className="rounded-2xl border border-hair bg-white p-5">
              <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-ink">Unified case timeline</h2><span className="text-[10px] uppercase tracking-[.12em] text-mute">One source of truth</span></div>
              <p className="mt-1 text-xs leading-5 text-mute">Application events, student notifications, payments and support activity in chronological order.</p>
              <div className="mt-4 divide-y divide-hair">{caseTimeline.length ? caseTimeline.map((event) => <div key={event.id} className="py-3 first:pt-0 last:pb-0"><div className="text-xs font-semibold text-ink">{event.title}</div><div className="mt-1 text-[11px] leading-5 text-mute">{event.meta}</div><div className="mt-1 text-[10px] text-mute">{event.at.toLocaleString()}</div></div>) : <p className="text-xs text-mute">No timeline activity yet.</p>}</div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-2xl border border-hair bg-white p-5">
              <h2 className="text-sm font-semibold text-ink">Conversation history</h2>
              <div className="mt-3 space-y-2">
                {profile.chatSessions.length === 0 ? <p className="text-xs text-mute">No saved conversations.</p> : profile.chatSessions.map((session) => session.workflow === "COUNSELOR" ? (
                  <Link key={session.id} href={`/admin/users/${profile.id}/conversations/${session.id}`} className="block rounded-xl bg-[#F7F8FA] p-3 hover:ring-1 hover:ring-hair">
                    <div className="text-xs font-semibold text-ink">{session.title || "Noodles"}</div>
                    <div className="mt-1 text-[10px] text-mute">Counselor · {session.updatedAt.toLocaleString()} · open / handoff →</div>
                  </Link>
                ) : (
                  <div key={session.id} className="rounded-xl bg-[#F7F8FA] p-3"><div className="text-xs font-semibold text-ink">{session.title || pretty(session.workflow)}</div><div className="mt-1 text-[10px] text-mute">{pretty(session.workflow)} · {session.updatedAt.toLocaleString()}</div></div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-hair bg-white p-5">
              <h2 className="text-sm font-semibold text-ink">Add alert</h2>
              <p className="mt-1 text-xs leading-5 text-mute">Sent to the student — appears on their dashboard (and by email, if enabled). Never use this for internal-only commentary.</p>
              <form action={addStudentAlert.bind(null, profile.id)} className="mt-4 space-y-2">
                <input name="title" required maxLength={200} placeholder="Alert title" className="w-full rounded-xl border border-hair px-3 py-2.5 text-sm outline-none focus:border-navy"/>
                <textarea name="body" required rows={3} placeholder="What does the student need to know?" className="w-full rounded-xl border border-hair px-3 py-2.5 text-sm leading-6 outline-none focus:border-navy"/>
                <button className="rounded-xl bg-navy px-4 py-2 text-xs font-semibold text-white">Send alert to student</button>
              </form>
            </section>

            <section className="rounded-2xl border border-hair bg-white p-5">
              <h2 className="text-sm font-semibold text-ink">Internal notes</h2>
              <p className="mt-1 text-xs leading-5 text-mute">Visible only to authorized SOUP staff.</p>
              <form action={addInternalUserNote.bind(null, profile.id)} className="mt-4"><textarea name="body" required rows={4} placeholder="Add an admissions, support or operational note" className="w-full rounded-xl border border-hair px-3 py-2.5 text-sm leading-6 outline-none focus:border-navy"/><button className="mt-2 rounded-xl bg-navy px-4 py-2 text-xs font-semibold text-white">Add internal note</button></form>
              <div className="mt-5 space-y-3">{profile.internalNotes.length === 0 ? <p className="text-xs text-mute">No internal notes.</p> : profile.internalNotes.map((note) => <div key={note.id} className="rounded-xl bg-[#F7F8F9] p-3"><p className="text-xs leading-5 text-ink">{note.body}</p><div className="mt-2 text-[10px] text-mute">{note.authoredBy.fullName} · {note.createdAt.toLocaleString()}</div></div>)}</div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
