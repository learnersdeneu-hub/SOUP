import Link from "next/link";
import { ArrowLeft, ExternalLink, FileText, ListChecks } from "lucide-react";
import { Header } from "@/components/Header";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { OpenDocumentButton } from "@/components/documents/OpenDocumentButton";
import { ApplicationRequirementsButton } from "@/components/applications/ApplicationRequirementsButton";
import { StudentApprovalButton } from "@/components/applications/StudentApprovalButton";
import { WithdrawApplicationButton } from "@/components/applications/WithdrawApplicationButton";
import { safeHttpUrl } from "@/lib/security/urls";
import { isSupersededChecklist } from "@/lib/journey/checklists";
import { JourneyItemAction } from "@/components/journey/JourneyItemAction";
import { checklistMetadata, isStudentActionItem, isStudentApprovalBlockingItem, missingCoreApplicationInformation } from "@/lib/applications/readiness";
import { deadlineUrgency, documentIsSubmissionReady, nextApplicationAction, requirementCompleteForSubmission, requirementOwner } from "@/lib/applications/lifecycle";

function nice(value: string) { return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }

export default async function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const { profile } = await requireProfile();
  const application = await prisma.studentApplication.findFirst({
    where: { id: params.id, profileId: profile.id },
    include: {
      university: true,
      program: true,
      offerDocument: true,
      documents: { include: { document: true }, orderBy: { createdAt: "desc" } },
      checklists: { where: { kind: "ADMISSION" }, include: { items: { include: { document: true }, orderBy: { position: "asc" } } }, orderBy: { createdAt: "desc" }, take: 10 },
      events: { orderBy: { createdAt: "desc" }, take: 25 },
      offerConditions: { orderBy: [{ status: "asc" }, { dueAt: "asc" }] },
      profile: { include: { user: true, studentCase: true } },
    },
  });
  if (!application) return <div className="min-h-screen bg-paper"><Header signedIn/><main className="mx-auto max-w-4xl px-5 py-10 text-sm text-mute">Application not found.</main></div>;
  const checklist = application.checklists.find((candidate) => !isSupersededChecklist(candidate.sourceSnapshot));
  const supplied = checklist?.items.filter((item) => ["DOCUMENT_UPLOADED", "COMPLETE"].includes(item.status)).length || 0;
  const requiredItems = checklist?.items.filter((item) => item.required && item.status !== "NOT_APPLICABLE") || [];
  const studentBlockingItems = requiredItems.filter(isStudentApprovalBlockingItem);
  const requiredComplete = studentBlockingItems.every((item) => requirementCompleteForSubmission(item));
  const missingCore = missingCoreApplicationInformation({
    fullName: application.profile.user.fullName,
    email: application.profile.user.email,
    dateOfBirth: application.profile.user.dateOfBirth,
    nationality: application.profile.user.nationality,
    currentCountry: application.profile.user.currentCountry,
    academicBackgroundSummary: application.profile.studentCase?.academicBackgroundSummary,
  });
  const applicantInfoComplete = missingCore.length === 0;
  const urgency = deadlineUrgency(application.deadlineAt);
  const nextAction = nextApplicationAction(application, checklist?.items || [], missingCore);
  const evidence = application.submissionEvidence && typeof application.submissionEvidence === "object" && !Array.isArray(application.submissionEvidence) ? application.submissionEvidence as Record<string, unknown> : null;
  const evidenceUrl = evidence && typeof evidence.url === "string" ? safeHttpUrl(evidence.url) : null;
  const openOfferConditions = application.offerConditions.filter((condition) => !["COMPLETE", "WAIVED"].includes(condition.status));

  return <div className="min-h-screen bg-paper"><Header signedIn/><main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
    <Link href="/applications" className="inline-flex items-center gap-1 text-xs font-semibold text-navy"><ArrowLeft size={12}/>Applications</Link>
    <section className="mt-4 rounded-2xl border border-hair bg-white p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="text-xs font-semibold uppercase tracking-[.14em] text-teal">{application.ownership === "SOUP_MANAGED" ? "SOUP-managed application" : "External application"}</div><h1 className="mt-2 text-2xl font-semibold text-ink">{application.university?.name || "University application"}</h1>{application.program && <p className="mt-1 text-sm text-mute">{application.program.title} · {application.program.level}</p>}<div className="mt-3 inline-flex rounded-full bg-[#EAF0F5] px-3 py-1.5 text-xs font-semibold text-navy">{nice(application.status)}</div></div><div className="flex flex-wrap gap-2">{!["WITHDRAWN", "REJECTED", "ENROLLED"].includes(application.status) && <WithdrawApplicationButton applicationId={application.id}/>} {application.offerDocument && <OpenDocumentButton documentId={application.offerDocument.id}/>} {application.externalApplicationUrl && <a href={application.externalApplicationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-hair px-3 py-2 text-xs font-semibold text-ink">Official application <ExternalLink size={11}/></a>}</div></div>
    </section>

    <section className="mt-5 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-hair bg-white p-4 sm:col-span-2"><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Next action</div><div className="mt-2 text-sm font-semibold text-ink">{nextAction.text}</div><div className="mt-1 text-[11px] text-mute">Owner: {nextAction.owner === "NONE" ? "No one" : nice(nextAction.owner)}</div></div>
      <div className="rounded-2xl border border-hair bg-white p-4"><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Application timing</div><div className="mt-2 text-sm font-semibold text-ink">{application.intake || application.program?.intake || "Intake not confirmed"}</div><div className="mt-1 text-[11px] text-mute">{urgency.label}</div>{application.deadlineAt && <div className="mt-1 text-[10px] text-mute">Deadline {application.deadlineAt.toLocaleDateString()}</div>}</div>
    </section>


    <section className="mt-3 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-hair bg-white p-4"><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Eligibility</div><div className="mt-2 text-sm font-semibold text-ink">{nice(application.eligibilityStatus)}</div><div className="mt-1 text-[11px] text-mute">{application.eligibilityStatus === "NEEDS_REVIEW" ? "SOUP must verify the program-specific entry route before submission." : application.eligibilityStatus === "LIKELY_ELIGIBLE" ? "Based on the saved plan; final admissions review remains with the university." : application.eligibilityStatus === "NOT_ELIGIBLE" ? "Do not submit until the route is changed or reviewed." : "Not checked yet."}</div></div>
      <div className="rounded-2xl border border-hair bg-white p-4"><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Application fee</div><div className="mt-2 text-sm font-semibold text-ink">{nice(application.applicationFeeStatus)}</div><div className="mt-1 text-[11px] text-mute">{application.applicationFeeAmount ? `${application.applicationFeeCurrency || ""} ${application.applicationFeeAmount}`.trim() : "No amount recorded"}</div></div>
      <div className="rounded-2xl border border-hair bg-white p-4"><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Reference</div><div className="mt-2 text-sm font-semibold text-ink">{application.externalReference || "Not submitted yet"}</div><div className="mt-1 text-[11px] text-mute">{application.submittedAt ? `Submitted ${application.submittedAt.toLocaleString()}` : "Reference appears after confirmed submission."}</div></div>
    </section>


    {application.submittedAt && <section className="mt-5 rounded-2xl border border-hair bg-white p-5 sm:p-6"><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Submission record</div><h2 className="mt-2 text-sm font-semibold text-ink">SOUP submission evidence</h2><div className="mt-3 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-paper p-4"><div className="text-[10px] text-mute">Submitted</div><div className="mt-1 text-xs font-semibold text-ink">{application.submittedAt.toLocaleString()}</div></div><div className="rounded-xl bg-paper p-4"><div className="text-[10px] text-mute">University reference</div><div className="mt-1 text-xs font-semibold text-ink">{application.externalReference || String(evidence?.reference || "Recorded in SOUP")}</div></div><div className="rounded-xl bg-paper p-4"><div className="text-[10px] text-mute">Evidence</div><div className="mt-1 text-xs font-semibold text-ink">{evidence?.note ? String(evidence.note) : evidenceUrl ? "Confirmation link stored" : "Submission event recorded"}</div>{evidenceUrl&&<a href={evidenceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-navy">Open confirmation <ExternalLink size={10}/></a>}</div></div><p className="mt-3 text-[11px] leading-5 text-mute">This is SOUP's operational submission record. The university portal/email remains authoritative for the institution's receipt and processing status.</p></section>}

    {application.offerConditions.length > 0 && <section className="mt-5 rounded-2xl border border-hair bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Offer conditions</div><h2 className="mt-2 text-sm font-semibold text-ink">{openOfferConditions.length ? `${openOfferConditions.length} condition${openOfferConditions.length===1?"":"s"} still open` : "All recorded conditions cleared"}</h2></div><Link href="/offers" className="text-xs font-semibold text-navy">Offer centre</Link></div><div className="mt-4 divide-y divide-hair">{application.offerConditions.map((condition)=><div key={condition.id} className="flex items-start justify-between gap-4 py-3"><div><div className="text-xs font-semibold text-ink">{condition.title}</div>{condition.description&&<div className="mt-1 text-[11px] text-mute">{condition.description}</div>}</div><div className="shrink-0 text-right"><div className="text-[10px] font-semibold text-mute">{nice(condition.status)}</div>{condition.dueAt&&<div className="mt-1 text-[10px] text-mute">Due {condition.dueAt.toLocaleDateString()}</div>}</div></div>)}</div></section>}

    <section className="mt-5 rounded-2xl border border-hair bg-white p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h2 className="text-sm font-semibold text-ink">Core application information</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-mute">SOUP tracks the core identity and academic facts needed to assemble a managed application. University-specific questions remain in the application checklist and are verified during final SOUP review.</p></div><span className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${applicantInfoComplete ? "bg-[#F0F7F5] text-teal" : "bg-[#FFF7DF] text-[#80651A]"}`}>{applicantInfoComplete ? "Complete" : `${missingCore.length} missing`}</span></div>
      {applicantInfoComplete ? <div className="mt-4 grid gap-2 text-[11px] text-mute sm:grid-cols-2"><div><strong className="text-ink">Legal name:</strong> {application.profile.user.fullName}</div><div><strong className="text-ink">Nationality:</strong> {application.profile.user.nationality}</div><div><strong className="text-ink">Country of residence:</strong> {application.profile.user.currentCountry}</div><div><strong className="text-ink">Date of birth:</strong> {application.profile.user.dateOfBirth?.toLocaleDateString()}</div></div> : <div className="mt-4 rounded-xl bg-paper p-4"><div className="text-xs font-semibold text-ink">Still needed</div><div className="mt-2 text-[11px] leading-5 text-mute">{missingCore.join(" · ")}</div><Link href={`/counselor?intent=universities&applicationId=${encodeURIComponent(application.id)}`} className="mt-3 inline-flex rounded-xl bg-navy px-3 py-2 text-[11px] font-semibold text-white">Complete with Counselor</Link></div>}
    </section>

    <section className="mt-5 rounded-2xl border border-hair bg-white p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2 text-sm font-semibold text-ink"><ListChecks size={15} className="text-navy"/>Application requirements</div><p className="mt-2 max-w-2xl text-xs leading-5 text-mute">SOUP tracks the exact application documents/actions against current official-source research. A document being stored or matched here does not mean the university has formally accepted it.</p></div>{application.ownership === "SOUP_MANAGED" && !checklist ? <ApplicationRequirementsButton applicationId={application.id}/> : null}</div>
      {!checklist ? <div className="mt-5 rounded-xl bg-paper p-4 text-xs text-mute">{application.ownership === "SOUP_MANAGED" ? "Prepare the source-backed checklist so SOUP admissions and the Counselor can see what is missing." : "SOUP is not claiming operational control over this external application."}</div> : <>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-paper p-4"><div><div className="text-xs font-semibold text-ink">{checklist.title}</div><div className="mt-1 text-[11px] text-mute">{supplied}/{checklist.items.length} supplied or complete · source checked {checklist.sourceCheckedAt?.toLocaleDateString() || "when generated"}</div></div><div className="flex flex-wrap items-center gap-2">{requiredComplete && applicantInfoComplete && application.ownership === "SOUP_MANAGED" && application.status === "DOCUMENTS_REQUIRED" ? <StudentApprovalButton applicationId={application.id}/> : null}{application.status === "READY_TO_SUBMIT" && <span className="rounded-full bg-[#F0F7F5] px-3 py-2 text-[10px] font-semibold text-teal">Approved by student · final SOUP checks</span>}{safeHttpUrl(checklist.sourceUrl) && <a href={safeHttpUrl(checklist.sourceUrl)!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-navy">Official source <ExternalLink size={11}/></a>}</div></div>
        <div className="mt-3 divide-y divide-hair">{checklist.items.map((item) => <div key={item.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="flex items-center gap-2"><span className="text-xs font-semibold text-ink">{item.title}</span>{item.required ? <span className="rounded-full bg-[#F1F4F7] px-2 py-0.5 text-[9px] font-semibold text-mute">Required</span> : <span className="rounded-full bg-[#F1F4F7] px-2 py-0.5 text-[9px] font-semibold text-mute">If applicable</span>}</div>{item.description && <p className="mt-1 text-[11px] leading-5 text-mute">{item.description}</p>}<div className="mt-1 flex flex-wrap gap-2 text-[10px] font-semibold text-mute"><span>{nice(item.status)}</span><span>Owner: {nice(requirementOwner(item))}</span>{item.document && <span>Document: {nice(item.document.reviewStatus)}</span>}</div>{safeHttpUrl(item.externalActionUrl) && <a href={safeHttpUrl(item.externalActionUrl)!} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-navy">{item.externalActionLabel || "Official action"} <ExternalLink size={10}/></a>}</div><div>{item.document ? <OpenDocumentButton documentId={item.document.id}/> : checklistMetadata(item.metadata).requiresDocument ? <Link href={`/counselor?intent=universities&applicationId=${encodeURIComponent(application.id)}&requestItem=${encodeURIComponent(item.id)}&requestLabel=${encodeURIComponent(item.title)}`} className="inline-flex items-center gap-1 rounded-xl border border-hair px-3 py-2 text-[11px] font-semibold text-ink"><FileText size={11}/>Upload with Counselor</Link> : isStudentActionItem(item) ? <JourneyItemAction itemId={item.id} complete={item.status === "COMPLETE"}/> : <span className="rounded-full bg-paper px-3 py-2 text-[10px] font-semibold text-mute">SOUP handling</span>}</div></div>)}</div>
      </>}
    </section>

    {application.events.length > 0 && <section className="mt-5 rounded-2xl border border-hair bg-white p-5 sm:p-6"><h2 className="text-sm font-semibold text-ink">Application history</h2><p className="mt-1 text-xs text-mute">A chronological record of material SOUP application actions. University decisions remain authoritative only when recorded from official correspondence.</p><div className="mt-4 divide-y divide-hair">{application.events.map((event) => <div key={event.id} className="py-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="text-xs font-semibold text-ink">{event.message}</div><div className="text-[10px] text-mute">{event.createdAt.toLocaleString()}</div></div>{event.fromStatus && event.toStatus && <div className="mt-1 text-[10px] text-mute">{nice(event.fromStatus)} → {nice(event.toStatus)}</div>}</div>)}</div></section>}
  </main></div>;
}
