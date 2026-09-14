import Link from "next/link";
import { Activity, AlertTriangle, BadgeDollarSign, CheckCircle2, Clock3, FileStack, GraduationCap, LifeBuoy, MailCheck, Send, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { requireRole } from "@/lib/auth/currentUser";
import { APPLICATION_ROLES, CASE_ROLES, COMMERCIAL_ROLES, DOCUMENT_ROLES, STAFF_ROLES, SUPPORT_ROLES, ADMIN_ROLES } from "@/lib/auth/roles";
import { getAdminDashboardData } from "@/lib/queries/dashboard";
import { prisma } from "@/lib/prisma";
import type { AppRole, Prisma, ServiceReferralType } from "@prisma/client";

function hasRole(role: AppRole, roles: readonly AppRole[]) { return roles.includes(role); }
function nice(value: string) { return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }

export default async function AdminDashboardPage() {
  const current = await requireRole(STAFF_ROLES);
  const role = current.user.role;
  const isFullOperations = ["COUNSELOR", "ADMISSIONS", "ADMIN", "SUPER_ADMIN"].includes(role);
  const full = isFullOperations ? await getAdminDashboardData() : null;

  const supportOpen = role === "SUPPORT"
    ? await prisma.supportTicket.count({ where: { OR: [{ assignedToUserId: current.user.id }, { assignedToUserId: null }], status: { in: ["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"] } } })
    : 0;
  const financeTypes: ServiceReferralType[] = ["STUDENT_FINANCE", "INSURANCE", "SCHOLARSHIP"];
  const commercialWhere: Prisma.ServiceReferralWhereInput = role === "ACCOMMODATION"
    ? { type: "ACCOMMODATION" }
    : role === "FINANCE" ? { type: { in: financeTypes } } : {};
  const commercial = hasRole(role, COMMERCIAL_ROLES) ? await prisma.serviceReferral.count({ where: commercialWhere }) : 0;
  const completedCommercial = hasRole(role, COMMERCIAL_ROLES) ? await prisma.serviceReferral.count({ where: { ...commercialWhere, status: "COMPLETED" } }) : 0;

  const metrics = isFullOperations && full ? [
    ["Active students", full.students, Users],
    ["Ready to submit", full.readyToSubmit, Send],
    ["Documents to review", full.documentReview, FileStack],
    ["Deadlines ≤ 7 days", full.deadlinesSoon, Clock3],
  ] as const : role === "SUPPORT"
    ? [["Open support work", supportOpen, LifeBuoy]] as const
    : [["Partner referrals", commercial, BadgeDollarSign], ["Completed referrals", completedCommercial, MailCheck]] as const;

  const operations = [
    hasRole(role, CASE_ROLES) && ["/admin/users", "Student & user cases"],
    hasRole(role, APPLICATION_ROLES) && ["/admin/applications", "Applications & offers"],
    hasRole(role, DOCUMENT_ROLES) && ["/admin/documents", "Document operations"],
    ["COUNSELOR", "ADMISSIONS", "FINANCE", "ACCOMMODATION", "ADMIN", "SUPER_ADMIN"].includes(role) && ["/admin/partners", "Partner catalog"],
    hasRole(role, COMMERCIAL_ROLES) && ["/admin/referrals", "Partner referrals & revenue"],
    hasRole(role, SUPPORT_ROLES) && ["/admin/support", "Support queue"],
    hasRole(role, SUPPORT_ROLES) && ["/admin/audit", "Audit trail"],
    hasRole(role, CASE_ROLES) && ["/admin/concierge", "SOUP Concierge queue"],
    hasRole(role, CASE_ROLES) && ["/admin/sessions", "Counselor sessions"],
    hasRole(role, ADMIN_ROLES) && ["/admin/analytics", "Funnel analytics"],
    ["/notifications", "Staff notifications"],
    hasRole(role, ADMIN_ROLES) && ["/admin/settings", "Runtime settings"],
  ].filter(Boolean) as string[][];

  const queues = full ? [
    ["Ready to submit", full.readyToSubmit, "/admin/applications", "Final checks and submission evidence", Send],
    ["Waiting on student", full.waitingForStudent, "/admin/applications", "Documents, approvals or missing case facts", AlertTriangle],
    ["Waiting on university", full.waitingForUniversity, "/admin/applications", "Submitted cases awaiting a decision/update", Clock3],
    ["Document review", full.documentReview, "/admin/documents", "Uploaded evidence needing a staff decision", FileStack],
    ["Support", full.openTickets, "/admin/support", "Open or active customer support requests", LifeBuoy],
    ["Concierge cases", full.conciergeCases, "/admin/concierge", "High-touch cases requiring priority ownership", CheckCircle2],
    ["Session requests", full.sessionRequests, "/admin/sessions", "Concierge video sessions waiting to be scheduled", Clock3],
  ] as const : [];

  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn />
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <section className="rounded-[28px] bg-navy px-6 py-7 text-white sm:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">SOUP operations · {role.replaceAll("_", " ")}</div>
              <h1 className="mt-2 text-2xl font-semibold">Internal command centre</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Role-scoped operations from priority queues, not scattered records. Student cases, Noodles, applications, documents, support and partner operations share the same underlying journey.</p>
            </div>
            <Activity size={24} className="hidden text-white/70 sm:block" />
          </div>
        </section>

        <section className={`mt-5 grid gap-3 ${metrics.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2"}`}>
          {metrics.map(([label, value, Icon]) => <div key={label} className="rounded-2xl border border-hair bg-white p-5"><Icon size={16} className="text-navy"/><div className="mt-4 text-2xl font-semibold text-ink">{value}</div><div className="mt-1 text-xs text-mute">{label}</div></div>)}
        </section>

        {isFullOperations && full ? <>
          <section className="mt-5">
            <div className="mb-3 flex items-end justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Today</div><h2 className="mt-1 text-base font-semibold text-ink">Priority work queues</h2></div><div className="text-xs text-mute">Click a queue to work the underlying cases</div></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {queues.map(([label, value, href, note, Icon]) => <Link key={label} href={href} className="group rounded-2xl border border-hair bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-sm"><div className="flex items-start justify-between gap-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF0F5]"><Icon size={15} className="text-navy"/></div><div className="text-2xl font-semibold text-ink">{value}</div></div><div className="mt-4 text-sm font-semibold text-ink">{label}</div><p className="mt-1 text-xs leading-5 text-mute">{note}</p></Link>)}
            </div>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
            <div className="rounded-2xl border border-hair bg-white p-5">
              <div className="flex items-center justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Live case movement</div><h2 className="mt-1 text-base font-semibold text-ink">Recently updated applications</h2></div><Link href="/admin/applications" className="text-xs font-semibold text-navy">Open all</Link></div>
              <div className="mt-4 divide-y divide-hair">{full.recentApplications.length ? full.recentApplications.map((app) => <Link key={app.id} href="/admin/applications" className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><div className="truncate text-xs font-semibold text-ink">{app.profile.user.fullName} · {app.university?.name || "University application"}</div><div className="mt-1 truncate text-[11px] text-mute">{app.program?.title || "Program not recorded"} · {app.ownership === "SOUP_MANAGED" ? "SOUP-managed" : "External"}</div></div><div className="shrink-0 text-right"><div className="text-[10px] font-semibold text-navy">{nice(app.status)}</div><div className="mt-1 text-[10px] text-mute">{app.updatedAt.toLocaleDateString()}</div></div></Link>) : <p className="py-6 text-sm text-mute">No application activity yet.</p>}</div>
            </div>
            <div className="rounded-2xl border border-hair bg-white p-5">
              <div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold text-ink">Newest student cases</h2><span className="text-xs text-mute">{full.users} total users</span></div>
              <div className="mt-4 divide-y divide-hair">{full.latestUsers.map((item) => <Link href="/admin/users" key={item.id} className="flex items-center justify-between gap-4 py-3"><div className="min-w-0"><div className="truncate text-xs font-semibold text-ink">{item.fullName}</div><div className="truncate text-[11px] text-mute">{item.email}</div></div><div className="shrink-0 text-right"><div className="text-[10px] font-semibold text-ink">{item.profile?.studentCase?.stage?.replaceAll("_", " ") || item.role}</div><div className="mt-1 text-[10px] text-mute">{item.createdAt.toLocaleDateString()}</div></div></Link>)}</div>
            </div>
          </section>
        </> : null}

        <section className="mt-5 rounded-2xl border border-hair bg-white p-5">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Operations</div><h2 className="mt-1 text-base font-semibold text-ink">Your role-scoped workspace</h2></div><p className="text-xs text-mute">Internal notes and operational controls stay hidden from students.</p></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{operations.map(([href, label]) => <Link key={href} href={href} className="rounded-xl border border-hair px-4 py-3 text-xs font-semibold text-ink transition hover:bg-paper">{label}</Link>)}</div>
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#F7F8FA] p-3 text-xs leading-5 text-mute"><LifeBuoy size={14} className="mt-0.5 shrink-0 text-teal"/>Noodles, the student dashboard and staff operations read from the same saved student case. Staff decisions should update the case rather than creating parallel notes the student-facing system cannot understand.</div>
        </section>
      </main>
    </div>
  );
}
