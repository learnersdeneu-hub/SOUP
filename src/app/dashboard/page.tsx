import Link from "next/link";
import { AlertTriangle, ArrowRight, Bell, BriefcaseBusiness, CheckCircle2, CreditCard, Download, FileText, GraduationCap, LifeBuoy, MessageCircle, PlaneTakeoff, Search, ShieldCheck, Sparkles, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StudyHeader } from "@/components/layout/StudyHeader";
import { ChatWithNoodlesFab } from "@/components/home/ChatWithNoodlesFab";
import { SupportLauncher } from "@/components/support/SupportLauncher";
import { NoodlesLoader } from "@/components/ui/NoodlesLoader";
import { requireProfile } from "@/lib/auth/currentUser";
import { getCustomerDashboardData } from "@/lib/queries/dashboard";
import { syncStudentAlerts } from "@/lib/student/alerts";
import { DirectApplicationBox } from "@/components/applications/DirectApplicationBox";
import { DirectDocumentUpload } from "@/components/documents/DirectDocumentUpload";
import { OpenDocumentButton } from "@/components/documents/OpenDocumentButton";
import { ApplicationProgressCard } from "@/components/dashboard/ApplicationProgressCard";
import { InstitutionPromptBanner } from "@/components/dashboard/InstitutionPromptBanner";
import { PREMIUM_COUNSELING_TITLE } from "@/lib/payments/config";

function appInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 3).map((part) => part[0]?.toUpperCase()).join("");
}

const APPLICATION_STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  SHORTLISTED: { bg: "#F1F2EE", fg: "#3D4A63" },
  DOCUMENTS_REQUIRED: { bg: "#FFF4CC", fg: "#6B5000" },
  READY_TO_SUBMIT: { bg: "#E9EEFB", fg: "#1F3FA8" },
  SUBMITTED: { bg: "#E9EEFB", fg: "#1F3FA8" },
  UNDER_REVIEW: { bg: "#E9EEFB", fg: "#1F3FA8" },
  OFFER_RECEIVED: { bg: "#E8F4EF", fg: "#0B6B50" },
  CONDITIONAL_OFFER: { bg: "#E8F4EF", fg: "#0B6B50" },
  ENROLLED: { bg: "#E8F4EF", fg: "#0B6B50" },
  REJECTED: { bg: "#FDE8DE", fg: "#8A2E07" },
  WITHDRAWN: { bg: "#F1F2EE", fg: "#3D4A63" },
};

// Ported from the old /documents page (now a redirect to here — see
// src/app/documents/page.tsx) when Standard Documents was retired from the
// My Application Progress stepper. Expires/validity labels and the
// authority-acceptance disclaimer below are a real invariant this product
// relies on (SOUP can read dates from documents to flag upcoming expiry,
// but that is never the same as a university/embassy/insurer accepting the
// document), not just old-page decoration — see scripts/deep-check.mjs's
// "Document validity metadata..." check, which now reads this file instead
// of the retired page.
const DOCUMENT_STATUS_STYLE: Record<string, string> = {
  UPLOADED: "bg-slate-100 text-slate-700",
  PENDING_REVIEW: "bg-amber-50 text-amber-800",
  MORE_INFO_REQUIRED: "bg-orange-50 text-orange-800",
  APPROVED: "bg-emerald-50 text-emerald-800",
  REJECTED: "bg-red-50 text-red-700",
  EXPIRED: "bg-slate-100 text-slate-600",
};

function validityLabel(validUntil: Date | null, issuedAt: Date | null) {
  if (validUntil) {
    const days = Math.ceil((validUntil.getTime() - Date.now()) / 86_400_000);
    if (days < 0) return { text: `Expired ${validUntil.toLocaleDateString()}`, warn: true };
    if (days <= 90) return { text: `Expires ${validUntil.toLocaleDateString()} · ${days} day${days === 1 ? "" : "s"} left`, warn: true };
    return { text: `Valid until ${validUntil.toLocaleDateString()}`, warn: false };
  }
  if (issuedAt) return { text: `Issued ${issuedAt.toLocaleDateString()}`, warn: false };
  return { text: "No validity date extracted", warn: false };
}

// Explicit defense-in-depth against Next.js's client-side Router Cache
// serving one authenticated user's rendered page to a different user in
// the same browser tab after a sign-out/sign-in (this app is used on
// shared/school devices) — see the fix and full explanation in
// src/app/actions/auth.ts (invalidateAuthenticatedPages). requireProfile()/
// requireRole() already force dynamic rendering implicitly via cookies(),
// but that is an implicit guarantee a future refactor could silently
// break; this makes it explicit and impossible to regress unnoticed.
export const dynamic = "force-dynamic";

function stageLabel(stage?: string | null) {
  if (!stage) return "Exploring";
  return stage.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

const JOURNEY_STAGES = [
  ["EXPLORING", "Profile"], ["SHORTLISTING", "Matches"], ["APPLYING", "Applications"], ["AWAITING_DECISIONS", "Decisions"], ["OFFER_RECEIVED", "Offer"], ["VISA_PREPARATION", "Visa"], ["PRE_DEPARTURE", "Pre-departure"], ["ARRIVED", "Arrived"],
] as const;

function nice(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export default async function DashboardPage() {
  const { user, profile } = await requireProfile();
  await syncStudentAlerts(profile.id);
  const data = await getCustomerDashboardData(user.id);
  if (!data) return null;

  const firstName = user.fullName.split(" ")[0] || user.fullName;
  const currentStage = data.studentCase?.stage || "EXPLORING";
  const currentIndex = Math.max(0, JOURNEY_STAGES.findIndex(([stage]) => stage === currentStage));
  const matchCount = data.latestShortlist?._count.items || 0;
  const finalChoiceCount = data.activeApplications.length;

  const topAction = data.studentCase?.nextAction
    ? { href: "/counselor", title: "Continue your next step", note: data.studentCase.nextAction }
    : data.studentActionItems.length > 0
      ? { href: "/pending", title: `${data.studentActionItems.length} item${data.studentActionItems.length === 1 ? "" : "s"} need your attention`, note: data.studentActionItems[0]?.title || "Open your pending actions." }
      : !data.latestShortlist
        ? { href: "/counselor?intent=universities", title: "Build your first university match list", note: "Tell Noodles where, when, what you want to study and your budget." }
        : data.activeApplications.length === 0
          ? { href: "/plans", title: "Turn your matches into final choices", note: `You have ${matchCount || "saved"} university matches. Compare them and narrow toward your final three.` }
          : data.offers.length > 0
            ? { href: "/counselor", title: "Move into your post-offer journey", note: "You have an offer recorded. Noodles can now coordinate visa, accommodation, insurance and departure planning." }
            : { href: "/applications", title: "Review your active applications", note: `${data.activeApplications.length} application${data.activeApplications.length === 1 ? " is" : "s are"} currently in progress.` };

  const studentTasks = [
    ...data.studentActionItems.slice(0, 3).map((item) => ({ title: item.title, note: item.dueAt ? `Due ${item.dueAt.toLocaleDateString()}` : "Action required", href: "/pending" })),
    ...data.pendingApplicationFees.slice(0, 2).map((app) => ({ title: `${app.university?.name || "University"} application fee`, note: "Payment/action required", href: "/payments" })),
    ...data.documentAttention.slice(0, 2).map((doc) => ({ title: doc.originalFileName || doc.documentType, note: nice(doc.reviewStatus), href: "/dashboard" })),
  ].slice(0, 4);

  const soupTasks = [
    ...data.waitingOnSoup.slice(0, 3).map((app) => ({ title: app.university?.name || "University application", note: app.status === "READY_TO_SUBMIT" ? "SOUP is preparing final submission" : nice(app.status), href: `/applications/${app.id}` })),
    ...data.documents.filter((doc) => doc.reviewStatus === "PENDING_REVIEW").slice(0, 2).map((doc) => ({ title: doc.originalFileName || doc.documentType, note: "SOUP document review", href: "/dashboard" })),
  ].slice(0, 4);

  return (
    <div className="min-h-screen bg-paper">
      <StudyHeader current="dashboard" signedIn fullName={user.fullName} unreadCount={data.notifications.filter((item) => !item.readAt).length}/>
      <SupportLauncher signedIn />
      <main className="mx-auto max-w-[1600px] px-5 pb-16 pt-6 sm:px-6 xl:px-10">
        {!user.institutionName && <InstitutionPromptBanner fullName={user.fullName} />}

        <section className="flex flex-wrap items-center gap-7 rounded-[28px] bg-navy p-8 text-white">
          <div className="flex min-w-0 flex-[999_1_480px] flex-col gap-3">
            <span className="self-start rounded-[20px] bg-[#FFF4CC] px-3 py-1.5 text-[13px] font-bold text-navy">Stage: {stageLabel(currentStage)}</span>
            <h1 className="m-0 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">Welcome back, {firstName}</h1>
            <p className="m-0 max-w-xl text-base leading-relaxed text-[#D3DAEA]">You have <strong className="text-white">{studentTasks.length} thing{studentTasks.length === 1 ? "" : "s"} to do</strong>{data.documents.filter((d) => d.reviewStatus === "PENDING_REVIEW").length > 0 ? ` and SOUP is reviewing ${data.documents.filter((d) => d.reviewStatus === "PENDING_REVIEW").length} of your documents` : ""}. Here&rsquo;s the most important one.</p>
          </div>
          <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-2.5 rounded-2xl bg-white p-5 text-ink">
            <span className="text-xs font-bold uppercase tracking-wider text-teal">Next step</span>
            <span className="text-[17px] font-extrabold leading-snug">{topAction.title}</span>
            <span className="text-sm leading-snug text-mute">{topAction.note}</span>
            <div className="mt-1 flex gap-2">
              <Link href={topAction.href} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-teal text-[15px] font-bold text-white no-underline"><Upload size={18}/>Continue</Link>
              <Link href="/counselor" className="flex h-12 items-center justify-center rounded-xl border-[1.5px] border-hair px-4 text-sm font-bold text-ink no-underline">Ask Noodles</Link>
            </div>
          </div>
        </section>

        <section className="mt-5 flex flex-col gap-[18px] rounded-[24px] border border-hair bg-white p-6 sm:p-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="m-0 text-lg font-extrabold text-ink">Your journey</h2>
            <Link href="/journey" className="text-sm font-bold text-navy no-underline">See full journey <ArrowRight size={12} className="ml-1 inline"/></Link>
          </div>
          <ol className="m-0 grid list-none grid-cols-4 gap-1.5 p-0 sm:grid-cols-8">
            {JOURNEY_STAGES.map(([key, label], index) => {
              const active = index === currentIndex;
              const done = index < currentIndex;
              return (
                <li key={key} className="flex flex-col gap-2">
                  <span className={`h-2 rounded-full ${done || active ? "bg-teal" : "bg-hair"} ${active ? "bg-navy" : ""}`}/>
                  <span className={`text-[13px] font-bold ${done ? "text-teal" : active ? "text-ink" : "text-mute"}`}>{done ? "✓ " : ""}{label}</span>
                  {active && <span className="-mt-1.5 text-xs text-mute">You are here</span>}
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-label="At a glance" className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Link href="/applications" className="flex flex-col gap-1 rounded-[18px] border border-hair bg-white p-[18px] no-underline text-ink"><span className="text-[30px] font-extrabold">{data.activeApplications.length}</span><span className="text-sm font-semibold text-mute">Active applications</span></Link>
          <Link href="/offers" className="flex flex-col gap-1 rounded-[18px] border border-hair bg-white p-[18px] no-underline text-ink"><span className="text-[30px] font-extrabold">{data.offers.length}</span><span className="text-sm font-semibold text-mute">Offers so far</span></Link>
          <a href="#document-vault" className="flex flex-col gap-1 rounded-[18px] border border-hair bg-white p-[18px] no-underline text-ink"><span className="text-[30px] font-extrabold">{data.documentCount}</span><span className="text-sm font-semibold text-mute">Documents stored</span></a>
          <Link href="/payments" className={`flex flex-col gap-1 rounded-[18px] border p-[18px] no-underline text-ink ${data.pendingPayments.length + data.pendingApplicationFees.length > 0 ? "border-[#F1E2A8] bg-[#FFF8E1]" : "border-hair bg-white"}`}><span className="text-[30px] font-extrabold">{data.pendingPayments.length + data.pendingApplicationFees.length}</span><span className={`text-sm font-semibold ${data.pendingPayments.length + data.pendingApplicationFees.length > 0 ? "text-[#6B5000]" : "text-mute"}`}>Payment{data.pendingPayments.length + data.pendingApplicationFees.length === 1 ? "" : "s"} pending</span></Link>
          <a href="#profile-progress" className="flex flex-col gap-1 rounded-[18px] border border-hair bg-white p-[18px] no-underline text-ink"><span className="text-[30px] font-extrabold">{data.completeness}%</span><span className="text-sm font-semibold text-mute">Profile ready</span></a>
        </section>

        <div className="mt-5 flex flex-wrap items-start gap-6">
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">

            <section className="rounded-[24px] border border-hair bg-white p-6">
              <div className="flex items-center gap-2"><AlertTriangle size={15} className="text-navy"/><h2 className="text-sm font-semibold text-ink">What you need to do</h2>{studentTasks.length > 0 && <span className="rounded-[10px] bg-[#FDE8DE] px-2.5 py-1 text-[13px] font-bold text-[#8A2E07]">{studentTasks.length} left</span>}</div>
              <div className="mt-4 divide-y divide-hair">
                {studentTasks.length ? studentTasks.map((item, index) => <Link key={`${item.title}-${index}`} href={item.href} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><div><div className="text-xs font-semibold text-ink">{item.title}</div><div className="mt-1 text-[11px] text-mute">{item.note}</div></div><ArrowRight size={12} className="shrink-0 text-mute"/></Link>) : <div className="rounded-xl bg-[#F4FAF8] p-4 text-xs leading-5 text-teal">Nothing needs your attention right now. SOUP will surface the next action here when one appears.</div>}
              </div>
            </section>

            <section className="rounded-[24px] border border-hair bg-white p-6">
              <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-ink">My applications</h2><Link href="/colleges" className="text-sm font-bold text-navy no-underline">+ Add a university</Link></div>
              <div className="mt-4 divide-y divide-hair">
                {data.applications.length ? data.applications.slice(0, 5).map((application) => {
                  const chip = APPLICATION_STATUS_STYLE[application.status] || APPLICATION_STATUS_STYLE.SHORTLISTED;
                  return (
                    <Link key={application.id} href={`/applications/${application.id}`} className="flex items-center gap-3.5 py-3.5 no-underline text-ink first:pt-0 last:pb-0">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E9EEFB] text-[13px] font-extrabold text-[#1F3FA8]">{appInitials(application.university?.name || "SOUP")}</span>
                      <div className="min-w-0 flex-1"><div className="truncate text-[15px] font-bold">{application.university?.name || "University application"}</div><div className="mt-0.5 truncate text-[13px] text-mute">{application.university?.country || "SOUP network"}</div></div>
                      <span className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold" style={{ background: chip.bg, color: chip.fg }}>{nice(application.status)}</span>
                    </Link>
                  );
                }) : <div className="rounded-xl bg-paper p-4 text-xs leading-5 text-mute">You haven&rsquo;t started any applications yet — browse universities or ask Noodles for matches.</div>}
                {data.applications.length > 5 && <Link href="/applications" className="block pt-3 text-sm font-bold text-navy no-underline">See all {data.applications.length} applications</Link>}
              </div>
            </section>

            <section id="document-vault" className="rounded-[24px] border border-hair bg-white p-6 scroll-mt-20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Document vault</div>
                  <h2 className="mt-1 text-sm font-semibold text-ink">Everything you've uploaded, reused across every application</h2>
                </div>
              </div>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-mute">SOUP can read dates from documents to flag upcoming expiry, but authority acceptance and freshness rules remain separate — a university, embassy or insurer still makes the final call.</p>
              {data.documents.length === 0 ? (
                <div className="mt-4 rounded-xl bg-paper p-4 text-xs leading-5 text-mute">Documents you upload across Profile & Details, Education, Testing, Funding and Extracurricular & Recommendations will appear here.</div>
              ) : (
                <div className="mt-4 divide-y divide-hair">
                  {data.documents.slice(0, 5).map((doc) => {
                    const validity = validityLabel(doc.validUntil, doc.documentIssuedAt);
                    return (
                      <div key={doc.id} className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-ink">{doc.originalFileName || doc.documentType}</div>
                          <div className="mt-0.5 text-[11px] text-mute">uploaded {doc.uploadedAt.toLocaleDateString()}</div>
                        </div>
                        <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold ${DOCUMENT_STATUS_STYLE[doc.reviewStatus] || DOCUMENT_STATUS_STYLE.UPLOADED}`}>{nice(doc.reviewStatus)}</span>
                        <span className={`text-[11px] ${validity.warn ? "font-semibold text-amber-800" : "text-mute"}`}>{validity.text}</span>
                        <OpenDocumentButton documentId={doc.id}/>
                      </div>
                    );
                  })}
                </div>
              )}
              {data.documentCount > 5 && <div className="mt-3 text-[11px] text-mute">+{data.documentCount - 5} more document{data.documentCount - 5 === 1 ? "" : "s"} in your vault.</div>}
              <div className="mt-4"><DirectDocumentUpload/></div>
            </section>

            <section className="rounded-[24px] border border-hair bg-white p-6">
              <div className="flex items-center justify-between gap-3">
                <div><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">University workspace</div><h2 className="mt-1 text-sm font-semibold text-ink">Application command centre · Application Plans · matches → final choices → applications</h2></div>
                <Link href="/plans" className="text-xs font-semibold text-navy">View matches</Link>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl bg-paper p-4"><div className="text-2xl font-semibold text-ink">{matchCount}</div><div className="mt-1 text-xs text-mute">Latest matches</div></div>
                <div className="rounded-xl bg-paper p-4"><div className="text-2xl font-semibold text-ink">{finalChoiceCount}</div><div className="mt-1 text-xs text-mute">Active choices</div></div>
                <div className="rounded-xl bg-paper p-4"><div className="text-2xl font-semibold text-ink">{data.offers.length}</div><div className="mt-1 text-xs text-mute">Offers</div></div>
              </div>
              {data.latestShortlist?.items.length ? <div className="mt-4 flex flex-wrap gap-2">{data.latestShortlist.items.slice(0, 6).map((item) => <Link key={item.id} href={`/universities/${item.university.id}`} className="rounded-full border border-hair px-3 py-1.5 text-[11px] font-semibold text-ink">{item.university.name}</Link>)}</div> : <p className="mt-4 text-xs leading-5 text-mute">Noodles will save your first broad university match list here once your profile is ready.</p>}
              <div className="mt-4"><DirectApplicationBox/></div>
            </section>
          </div>

          <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
            <div id="profile-progress" className="scroll-mt-20"><ApplicationProgressCard progress={data.applicationProgress}/></div>

            <section className="rounded-[24px] border border-hair bg-white p-6">
              <div className="flex items-center gap-2"><Sparkles size={15} className="text-teal"/><h2 className="text-sm font-semibold text-ink">What SOUP is handling</h2></div>
              <div className="mt-4 divide-y divide-hair">
                {soupTasks.length ? soupTasks.map((item, index) => <Link key={`${item.title}-${index}`} href={item.href} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><div><div className="text-xs font-semibold text-ink">{item.title}</div><div className="mt-1 text-[11px] text-mute">{item.note}</div></div><CheckCircle2 size={13} className="shrink-0 text-teal"/></Link>) : <div className="rounded-xl bg-paper p-4 text-xs leading-5 text-mute">No active SOUP-side task is waiting right now. When your case moves into review, submission or university follow-up, it will appear here.</div>}
              </div>
            </section>

            <section className="rounded-[24px] border border-hair bg-white p-5">
              <h2 className="m-0 mb-1 text-base font-extrabold text-ink">Do it yourself</h2>
              <div className="mt-2 flex flex-col gap-2">
                <Link href="/counselor" className="flex items-center gap-3 rounded-[14px] border border-hair p-3 no-underline text-ink"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF4CC] text-[#8A6A00]"><NoodlesLoader size={18} active={false}/></span><span className="flex flex-col gap-0.5"><span className="text-sm font-bold">Start an application</span><span className="text-xs text-mute">Search the university network</span></span></Link>
                <Link href="/dashboard#document-vault" className="flex items-center gap-3 rounded-[14px] border border-hair p-3 no-underline text-ink"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E9EEFB]"><Upload size={18} className="text-[#1F3FA8]"/></span><span className="flex flex-col gap-0.5"><span className="text-sm font-bold">Upload documents</span><span className="text-xs text-mute">SOUP reads and files them</span></span></Link>
                <Link href="/services/insurance" className="flex items-center gap-3 rounded-[14px] border border-hair p-3 no-underline text-ink"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1E9FA]"><ShieldCheck size={18} className="text-[#6A3FA0]"/></span><span className="flex flex-col gap-0.5"><span className="text-sm font-bold">Insurance via InsureMart</span><span className="text-xs text-mute">Student travel insurance quotes</span></span></Link>
              </div>
            </section>

            <section className="rounded-[24px] border border-hair bg-white p-5">
              <div className="flex items-baseline justify-between"><h2 className="m-0 text-base font-extrabold text-ink">What&rsquo;s new</h2><Link href="/notifications" className="text-sm font-bold text-navy no-underline">View all</Link></div>
              <div className="mt-2 flex flex-col">
                {data.notifications.length ? data.notifications.slice(0, 4).map((item) => (
                  <Link key={item.id} href={item.href || "/notifications"} className="flex gap-2.5 py-2.5 no-underline text-ink">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.readAt ? "bg-[#9AA0A6]" : "bg-teal"}`}/>
                    <span className="text-sm leading-snug"><strong>{item.title}</strong> — {item.body}</span>
                  </Link>
                )) : <div className="py-2 text-sm text-mute">No case updates yet.</div>}
              </div>
            </section>

            <div className="rounded-2xl border border-hair bg-white p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Your case summary</div>
              <div className="mt-3 space-y-3 text-xs">
                <div className="flex items-center justify-between"><span className="text-mute">Profile readiness</span><span className="font-semibold text-ink">{data.completeness}%</span></div>
                <div className="flex items-center justify-between"><span className="text-mute">Verified documents</span><span className="font-semibold text-ink">{data.approvedDocuments.length}</span></div>
                <div className="flex items-center justify-between"><span className="text-mute">Open applications</span><span className="font-semibold text-ink">{data.activeApplications.length}</span></div>
                <div className="flex items-center justify-between"><span className="text-mute">Support plan</span><span className="font-semibold text-ink">{data.conciergeActive ? "SOUP Concierge" : data.plusActive ? PREMIUM_COUNSELING_TITLE : "SOUP"}</span></div>
              </div>
              {data.assignedCounselor ? <div className="mt-4 rounded-xl bg-[#F7FAFC] p-3"><div className="text-[10px] uppercase tracking-[.12em] text-mute">Assigned counselor</div><div className="mt-1 text-xs font-semibold text-ink">{data.assignedCounselor.fullName}</div></div> : null}
            </div>
          </aside>
        </div>

        {data.referrals.length ? <section className="mt-5 rounded-2xl border border-hair bg-white p-5"><div className="flex items-center justify-between"><div><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Services & partner activity</div><h2 className="mt-1 text-sm font-semibold text-ink">Connected to the same student case</h2></div></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{data.referrals.slice(0,6).map((referral) => <div key={referral.id} className="rounded-xl bg-paper p-4"><div className="text-xs font-semibold text-ink">{referral.title}</div><div className="mt-1 text-[11px] text-mute">{referral.partner?.name || "SOUP guidance"} · {nice(referral.status)}</div></div>)}</div></section> : null}

        {data.conciergeActive ? <section className="mt-5 rounded-2xl border border-[#C9D8E6] bg-[#F7FAFC] p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">SOUP Concierge</div><h2 className="mt-1 text-sm font-semibold text-ink">High-touch counseling is active</h2><p className="mt-1 text-xs leading-5 text-mute">Weekly counselor sessions, senior case oversight, accommodation search and priority end-to-end support stay connected to this case.</p>{data.nextCounselorSession ? <div className="mt-3 rounded-xl bg-white px-3 py-2 text-[11px] text-mute"><span className="font-semibold text-ink">{data.nextCounselorSession.status === "SCHEDULED" ? "Next session" : "Session request"}:</span> {data.nextCounselorSession.scheduledFor ? data.nextCounselorSession.scheduledFor.toLocaleString() : data.nextCounselorSession.requestedDate ? `preferred ${data.nextCounselorSession.requestedDate.toLocaleDateString()}` : "being arranged"}{data.nextCounselorSession.counselor?.fullName ? ` · ${data.nextCounselorSession.counselor.fullName}` : ""}</div> : null}</div><div className="flex flex-wrap gap-2"><Link href="/sessions" className="rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white">Counselor sessions</Link><Link href="/support" className="rounded-xl border border-hair bg-white px-4 py-2.5 text-xs font-semibold text-ink">Contact your team</Link></div></div></section> : null}

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {([
            ["/counselor", GraduationCap, "Noodles", "Continue your counseling conversation"],
            ["/colleges", BriefcaseBusiness, "My Colleges", "Selected universities and their requirements checklists"],
            ["/applications", BriefcaseBusiness, "Applications", `${data.activeApplications.length} active application${data.activeApplications.length === 1 ? "" : "s"}`],
            ["/offers", GraduationCap, "Offers & decisions", `${data.offers.length} recorded offer${data.offers.length === 1 ? "" : "s"}`],
            ["/visa", PlaneTakeoff, "Visa centre", data.offers.length ? "Post-offer visa checklist and next actions" : "Opens when an offer is recorded"],
            ["/payments", CreditCard, "Payments", `${data.pendingPayments.length + data.pendingApplicationFees.length} item${data.pendingPayments.length + data.pendingApplicationFees.length === 1 ? "" : "s"} pending`],
            ["/companion/connect", Download, "SOUP Companion", "Download the app for on-portal application help"],
            ["/notifications", Bell, "Updates", `${data.notifications.filter((item) => !item.readAt).length} unread`],
            ["/support", LifeBuoy, "Help & support", "Message SOUP or open an existing request"],
          ] satisfies Array<[string, LucideIcon, string, string]>).map(([href, Icon, title, note]) => <Link key={href} href={href} className="group flex items-start gap-3 rounded-2xl border border-hair bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-sm"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF0F5]"><Icon size={15} className="text-navy"/></div><div><div className="text-xs font-semibold text-ink">{title}</div><div className="mt-1 text-[11px] leading-4 text-mute">{note}</div></div></Link>)}
        </section>
      </main>
      <ChatWithNoodlesFab/>
    </div>
  );
}
