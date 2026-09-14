import Link from "next/link";
import { ArrowLeft, ExternalLink, FileText, ListChecks } from "lucide-react";
import { Header } from "@/components/Header";
import { requireRole } from "@/lib/auth/currentUser";
import { APPLICATION_OPERATIONS_ROLES, APPLICATION_ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { safeHttpUrl } from "@/lib/security/urls";
import { isSupersededChecklist } from "@/lib/journey/checklists";
import { OpenDocumentButton } from "@/components/documents/OpenDocumentButton";
import { ApplicationOperations } from "@/components/admin/ApplicationOperations";
import { ApplicationRequirementOperations } from "@/components/admin/ApplicationRequirementOperations";
import { ApplicationRequirementsButton } from "@/components/applications/ApplicationRequirementsButton";
import { ApplicationFactOperations } from "@/components/admin/ApplicationFactOperations";
import { addOfferCondition, updateOfferConditionStatus } from "@/app/actions/offers";

function nice(value: string) { return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }

export default async function AdminApplicationDetailPage({ params }: { params: { id: string } }) {
  const current = await requireRole(APPLICATION_ROLES);
  const canOperate = APPLICATION_OPERATIONS_ROLES.includes(current.user.role);
  const application = await prisma.studentApplication.findUnique({
    where: { id: params.id },
    include: {
      profile: { include: { user: true } }, university: true, program: true, offerDocument: true,
      documents: { include: { document: true }, orderBy: { createdAt: "desc" } },
      checklists: { where: { kind: "ADMISSION" }, include: { items: { include: { document: true }, orderBy: { position: "asc" } } }, orderBy: { createdAt: "desc" }, take: 10 },
      events: { orderBy: { createdAt: "desc" }, take: 50 },
      offerConditions: { orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!application) return <div className="min-h-screen bg-paper"><Header signedIn/><main className="mx-auto max-w-5xl px-5 py-10 text-sm text-mute">Application not found.</main></div>;
  const checklist = application.checklists.find((candidate) => !isSupersededChecklist(candidate.sourceSnapshot));
  const completeRequired = checklist?.items.filter((item) => item.required && ["COMPLETE", "NOT_APPLICABLE"].includes(item.status)).length || 0;
  const requiredCount = checklist?.items.filter((item) => item.required).length || 0;

  return <div className="min-h-screen bg-paper"><Header signedIn/><main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
    <Link href="/admin/applications" className="inline-flex items-center gap-1 text-xs font-semibold text-navy"><ArrowLeft size={12}/>Applications</Link>
    <section className="mt-4 rounded-2xl border border-hair bg-white p-5 sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start"><div><div className="text-xs font-semibold uppercase tracking-[.14em] text-teal">SOUP admissions case</div><h1 className="mt-2 text-2xl font-semibold text-ink">{application.university?.name || "University application"}</h1><p className="mt-1 text-sm text-mute">{application.profile.user.fullName} · {application.profile.user.email}</p>{application.program && <p className="mt-1 text-sm text-mute">{application.program.title} · {application.program.level}</p>}<div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-[#EAF0F5] px-3 py-1.5 text-xs font-semibold text-navy">{nice(application.status)}</span><span className="rounded-full bg-paper px-3 py-1.5 text-xs font-semibold text-mute">{nice(application.ownership)}</span></div></div>{canOperate ? <ApplicationOperations applicationId={application.id} status={application.status} managed={application.ownership === "SOUP_MANAGED"}/> : <div className="rounded-xl bg-paper px-3 py-2 text-[11px] font-semibold text-mute">Read-only application access</div>}</div>
      {canOperate && <ApplicationFactOperations applicationId={application.id} feeStatus={application.applicationFeeStatus} eligibilityStatus={application.eligibilityStatus} feeAmount={application.applicationFeeAmount?.toString() || null} feeCurrency={application.applicationFeeCurrency}/>}
    </section>

    <section className="mt-5 grid gap-3 sm:grid-cols-4">
      <div className="rounded-2xl border border-hair bg-white p-4"><div className="text-[10px] uppercase tracking-[.14em] text-teal">Eligibility</div><div className="mt-2 text-xs font-semibold text-ink">{nice(application.eligibilityStatus)}</div></div>
      <div className="rounded-2xl border border-hair bg-white p-4"><div className="text-[10px] uppercase tracking-[.14em] text-teal">Intake</div><div className="mt-2 text-xs font-semibold text-ink">{application.intake || application.program?.intake || "Not confirmed"}</div></div>
      <div className="rounded-2xl border border-hair bg-white p-4"><div className="text-[10px] uppercase tracking-[.14em] text-teal">Deadline</div><div className="mt-2 text-xs font-semibold text-ink">{application.deadlineAt?.toLocaleDateString() || "Not confirmed"}</div></div>
      <div className="rounded-2xl border border-hair bg-white p-4"><div className="text-[10px] uppercase tracking-[.14em] text-teal">Fee</div><div className="mt-2 text-xs font-semibold text-ink">{nice(application.applicationFeeStatus)}</div><div className="mt-1 text-[10px] text-mute">{application.applicationFeeAmount ? `${application.applicationFeeCurrency || ""} ${application.applicationFeeAmount}`.trim() : "No amount recorded"}</div></div>
    </section>

    <section className="mt-5 rounded-2xl border border-hair bg-white p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2 text-sm font-semibold text-ink"><ListChecks size={15} className="text-navy"/>Admissions requirements</div><p className="mt-2 max-w-2xl text-xs leading-5 text-mute">Staff acceptance here means the requirement is satisfied for SOUP's application file. It does not represent university acceptance or an admissions decision.</p></div><div className="flex flex-wrap items-center gap-2">{checklist && <div className="rounded-xl bg-paper px-3 py-2 text-xs font-semibold text-ink">{completeRequired}/{requiredCount} required items accepted</div>}{canOperate && <ApplicationRequirementsButton applicationId={application.id} staff refresh={Boolean(checklist)} label={checklist ? "Refresh official requirements" : "Prepare official requirements"}/>}</div></div>
      {!checklist ? <div className="mt-5 rounded-xl bg-paper p-4 text-xs text-mute">The student has not generated an application-requirements checklist yet.</div> : <>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-paper p-4"><div><div className="text-xs font-semibold text-ink">{checklist.title}</div><div className="mt-1 text-[11px] text-mute">Official source checked {checklist.sourceCheckedAt?.toLocaleDateString() || "when generated"}</div></div>{safeHttpUrl(checklist.sourceUrl) && <a href={safeHttpUrl(checklist.sourceUrl)!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-navy">Official source <ExternalLink size={11}/></a>}</div>
        <div className="mt-3 divide-y divide-hair">{checklist.items.map((item) => {
          const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata) ? item.metadata as Record<string, unknown> : {};
          const requiresDocument = Boolean(metadata.requiresDocument);
          return <div key={item.id} className="grid gap-4 py-4 lg:grid-cols-[1fr_auto_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-ink">{item.title}</span><span className="rounded-full bg-[#F1F4F7] px-2 py-0.5 text-[9px] font-semibold text-mute">{item.required ? "Required" : "If applicable"}</span><span className="text-[10px] font-semibold text-teal">{nice(item.status)}</span></div>{item.description && <p className="mt-1 max-w-2xl text-[11px] leading-5 text-mute">{item.description}</p>}{safeHttpUrl(item.externalActionUrl) && <a href={safeHttpUrl(item.externalActionUrl)!} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-navy">{item.externalActionLabel || "Official action"}<ExternalLink size={10}/></a>}</div><div>{item.document ? <OpenDocumentButton documentId={item.document.id}/> : requiresDocument ? <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-mute"><FileText size={11}/>Waiting for student file</div> : null}</div>{canOperate ? <ApplicationRequirementOperations applicationId={application.id} itemId={item.id} status={item.status} hasDocument={Boolean(item.documentId)} requiresDocument={requiresDocument}/> : <div className="text-[10px] font-semibold text-mute">Read only</div>}</div>;
        })}</div>
      </>}
    </section>

    {["OFFER_RECEIVED","CONDITIONAL_OFFER"].includes(application.status) && <section className="mt-5 rounded-2xl border border-hair bg-white p-5 sm:p-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h2 className="text-sm font-semibold text-ink">Offer conditions</h2><p className="mt-1 text-xs leading-5 text-mute">Track each condition independently so the student can see exactly what is still required before relying on a conditional offer.</p></div></div><div className="mt-4 divide-y divide-hair">{application.offerConditions.length ? application.offerConditions.map((condition)=><div key={condition.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="text-xs font-semibold text-ink">{condition.title}</div>{condition.description&&<div className="mt-1 text-[11px] text-mute">{condition.description}</div>}<div className="mt-1 text-[10px] text-mute">{nice(condition.status)}{condition.dueAt?` · due ${condition.dueAt.toLocaleDateString()}`:""}</div></div>{canOperate&&!["COMPLETE","WAIVED"].includes(condition.status)?<div className="flex gap-2"><form action={updateOfferConditionStatus.bind(null,condition.id,"IN_PROGRESS")}><button className="rounded-lg border border-hair px-2.5 py-1.5 text-[10px] font-semibold text-ink">In progress</button></form><form action={updateOfferConditionStatus.bind(null,condition.id,"COMPLETE")}><button className="rounded-lg bg-teal px-2.5 py-1.5 text-[10px] font-semibold text-white">Complete</button></form><form action={updateOfferConditionStatus.bind(null,condition.id,"WAIVED")}><button className="rounded-lg border border-hair px-2.5 py-1.5 text-[10px] font-semibold text-ink">Waived</button></form></div>:<span className="text-[10px] font-semibold text-mute">{nice(condition.status)}</span>}</div>):<div className="py-3 text-xs text-mute">No explicit offer conditions recorded.</div>}</div>{canOperate&&<form action={addOfferCondition.bind(null,application.id)} className="mt-4 grid gap-2 rounded-xl bg-paper p-4 sm:grid-cols-2"><input name="title" required placeholder="Condition, e.g. IELTS 6.5" className="rounded-xl border border-hair bg-white px-3 py-2 text-xs"/><input type="date" name="dueAt" className="rounded-xl border border-hair bg-white px-3 py-2 text-xs"/><input name="description" placeholder="What must the student provide or achieve?" className="rounded-xl border border-hair bg-white px-3 py-2 text-xs sm:col-span-2"/><input name="sourceUrl" placeholder="https:// official offer/source (optional)" className="rounded-xl border border-hair bg-white px-3 py-2 text-xs sm:col-span-2"/><button className="rounded-xl bg-navy px-3 py-2 text-xs font-semibold text-white sm:col-span-2">Add offer condition</button></form>}</section>}

    {application.documents.length > 0 && <section className="mt-5 rounded-2xl border border-hair bg-white p-5"><h2 className="text-sm font-semibold text-ink">Files bound to this application</h2><div className="mt-3 divide-y divide-hair">{application.documents.map((link) => <div key={link.id} className="flex items-center justify-between gap-3 py-3"><div><div className="text-xs font-semibold text-ink">{link.documentRole}</div><div className="mt-1 text-[10px] text-mute">{link.document.originalFileName || link.document.documentType}</div></div><OpenDocumentButton documentId={link.document.id}/></div>)}</div></section>}

    {application.events.length > 0 && <section className="mt-5 rounded-2xl border border-hair bg-white p-5"><h2 className="text-sm font-semibold text-ink">Operational history</h2><p className="mt-1 text-xs text-mute">SOUP-side event ledger for this application. This is operational history, not a substitute for official university correspondence.</p><div className="mt-4 divide-y divide-hair">{application.events.map((event) => <div key={event.id} className="py-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-semibold text-ink">{event.message}</div><div className="mt-1 text-[10px] text-mute">{nice(event.eventType)}{event.actorUserId ? ` · staff/user ${event.actorUserId.slice(0, 8)}` : ""}</div>{event.fromStatus && event.toStatus && <div className="mt-1 text-[10px] text-mute">{nice(event.fromStatus)} → {nice(event.toStatus)}</div>}</div><div className="text-[10px] text-mute">{event.createdAt.toLocaleString()}</div></div></div>)}</div></section>}
  </main></div>;
}
