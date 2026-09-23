import Link from "next/link";
import { AlertTriangle, ArrowRight, Bell, BriefcaseBusiness, CheckCircle2, CreditCard, Download, FileText, GraduationCap, LifeBuoy, MessageCircle, PlaneTakeoff, Search, ShieldCheck, Sparkles, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Header } from "@/components/Header";
import { SupportLauncher } from "@/components/support/SupportLauncher";
import { requireProfile } from "@/lib/auth/currentUser";
import { getCustomerDashboardData } from "@/lib/queries/dashboard";
import { syncStudentAlerts } from "@/lib/student/alerts";
import { DirectApplicationBox } from "@/components/applications/DirectApplicationBox";
import { DirectDocumentUpload } from "@/components/documents/DirectDocumentUpload";
import { ApplicationProgressCard } from "@/components/dashboard/ApplicationProgressCard";
import { InstitutionPromptBanner } from "@/components/dashboard/InstitutionPromptBanner";

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
    ...data.documentAttention.slice(0, 2).map((doc) => ({ title: doc.originalFileName || doc.documentType, note: nice(doc.reviewStatus), href: "/documents" })),
  ].slice(0, 4);

  const soupTasks = [
    ...data.waitingOnSoup.slice(0, 3).map((app) => ({ title: app.university?.name || "University application", note: app.status === "READY_TO_SUBMIT" ? "SOUP is preparing final submission" : nice(app.status), href: `/applications/${app.id}` })),
    ...data.documents.filter((doc) => doc.reviewStatus === "PENDING_REVIEW").slice(0, 2).map((doc) => ({ title: doc.originalFileName || doc.documentType, note: "SOUP document review", href: "/documents" })),
  ].slice(0, 4);

  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn />
      <SupportLauncher signedIn />
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-8">
        <section className="rounded-[30px] bg-navy px-6 py-7 text-white sm:px-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">My SOUP</div>
              <h1 className="mt-2 text-2xl font-semibold">Welcome back, {firstName}.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">One place for Noodles, your university choices, applications, documents, payments and what happens next.</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-3">
              <div className="text-[10px] uppercase tracking-[.14em] text-white/55">Current journey stage</div>
              <div className="mt-1 text-lg font-semibold">{stageLabel(currentStage)}</div>
            </div>
          </div>
        </section>

        {!user.institutionName && <InstitutionPromptBanner fullName={user.fullName} />}

        <section className="mt-5 rounded-2xl border border-[#C9D8E6] bg-[#F7FAFC] p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="max-w-2xl">
              <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Your next action</div>
              <h2 className="mt-2 text-lg font-semibold text-ink">{topAction.title}</h2>
              <p className="mt-1 text-xs leading-5 text-mute">{topAction.note}</p>
            </div>
            <Link href={topAction.href} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white">Continue <ArrowRight size={13}/></Link>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-hair bg-white p-5">
          <div className="flex items-end justify-between gap-3">
            <div><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Your journey</div><div className="mt-1 text-sm font-semibold text-ink">{stageLabel(currentStage)}</div></div>
            <Link href="/journey" className="text-xs font-semibold text-navy">Open journey <ArrowRight size={12} className="ml-1 inline"/></Link>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-1 sm:grid-cols-8">
            {JOURNEY_STAGES.map(([key, label], index) => {
              const active = index === currentIndex;
              const done = index < currentIndex;
              return <div key={key} className={`rounded-lg px-2 py-2 text-center text-[9px] font-semibold sm:text-[10px] ${active ? "bg-[#EAF0F5] text-navy" : done ? "bg-[#F0F7F5] text-teal" : "bg-paper text-mute"}`}>{done ? "✓ " : ""}{label}</div>;
            })}
          </div>
        </section>

        <ApplicationProgressCard progress={data.applicationProgress}/>

        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-hair bg-white p-5">
            <div className="flex items-center gap-2"><AlertTriangle size={15} className="text-navy"/><h2 className="text-sm font-semibold text-ink">What you need to do</h2></div>
            <div className="mt-4 divide-y divide-hair">
              {studentTasks.length ? studentTasks.map((item, index) => <Link key={`${item.title}-${index}`} href={item.href} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><div><div className="text-xs font-semibold text-ink">{item.title}</div><div className="mt-1 text-[11px] text-mute">{item.note}</div></div><ArrowRight size={12} className="shrink-0 text-mute"/></Link>) : <div className="rounded-xl bg-[#F4FAF8] p-4 text-xs leading-5 text-teal">Nothing needs your attention right now. SOUP will surface the next action here when one appears.</div>}
            </div>
          </div>
          <div className="rounded-2xl border border-hair bg-white p-5">
            <div className="flex items-center gap-2"><Sparkles size={15} className="text-teal"/><h2 className="text-sm font-semibold text-ink">What SOUP is handling</h2></div>
            <div className="mt-4 divide-y divide-hair">
              {soupTasks.length ? soupTasks.map((item, index) => <Link key={`${item.title}-${index}`} href={item.href} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><div><div className="text-xs font-semibold text-ink">{item.title}</div><div className="mt-1 text-[11px] text-mute">{item.note}</div></div><CheckCircle2 size={13} className="shrink-0 text-teal"/></Link>) : <div className="rounded-xl bg-paper p-4 text-xs leading-5 text-mute">No active SOUP-side task is waiting right now. When your case moves into review, submission or university follow-up, it will appear here.</div>}
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-2xl border border-hair bg-white p-5">
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
          </div>

          <div className="space-y-4">
            <DirectApplicationBox/>
            <DirectDocumentUpload/>
            <div className="rounded-2xl border border-hair bg-white p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Your case summary</div>
              <div className="mt-3 space-y-3 text-xs">
                <div className="flex items-center justify-between"><span className="text-mute">Profile readiness</span><span className="font-semibold text-ink">{data.completeness}%</span></div>
                <div className="flex items-center justify-between"><span className="text-mute">Verified documents</span><span className="font-semibold text-ink">{data.approvedDocuments.length}</span></div>
                <div className="flex items-center justify-between"><span className="text-mute">Open applications</span><span className="font-semibold text-ink">{data.activeApplications.length}</span></div>
                <div className="flex items-center justify-between"><span className="text-mute">Support plan</span><span className="font-semibold text-ink">{data.conciergeActive ? "SOUP Concierge" : data.plusActive ? "SOUP Plus" : "SOUP"}</span></div>
              </div>
              {data.assignedCounselor ? <div className="mt-4 rounded-xl bg-[#F7FAFC] p-3"><div className="text-[10px] uppercase tracking-[.12em] text-mute">Assigned counselor</div><div className="mt-1 text-xs font-semibold text-ink">{data.assignedCounselor.fullName}</div></div> : null}
            </div>
          </div>
        </section>

        {data.referrals.length ? <section className="mt-5 rounded-2xl border border-hair bg-white p-5"><div className="flex items-center justify-between"><div><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Services & partner activity</div><h2 className="mt-1 text-sm font-semibold text-ink">Connected to the same student case</h2></div></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{data.referrals.slice(0,6).map((referral) => <div key={referral.id} className="rounded-xl bg-paper p-4"><div className="text-xs font-semibold text-ink">{referral.title}</div><div className="mt-1 text-[11px] text-mute">{referral.partner?.name || "SOUP guidance"} · {nice(referral.status)}</div></div>)}</div></section> : null}

        {data.conciergeActive ? <section className="mt-5 rounded-2xl border border-[#C9D8E6] bg-[#F7FAFC] p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">SOUP Concierge</div><h2 className="mt-1 text-sm font-semibold text-ink">High-touch counseling is active</h2><p className="mt-1 text-xs leading-5 text-mute">Weekly counselor sessions, senior case oversight, accommodation search and priority end-to-end support stay connected to this case.</p>{data.nextCounselorSession ? <div className="mt-3 rounded-xl bg-white px-3 py-2 text-[11px] text-mute"><span className="font-semibold text-ink">{data.nextCounselorSession.status === "SCHEDULED" ? "Next session" : "Session request"}:</span> {data.nextCounselorSession.scheduledFor ? data.nextCounselorSession.scheduledFor.toLocaleString() : data.nextCounselorSession.requestedDate ? `preferred ${data.nextCounselorSession.requestedDate.toLocaleDateString()}` : "being arranged"}{data.nextCounselorSession.counselor?.fullName ? ` · ${data.nextCounselorSession.counselor.fullName}` : ""}</div> : null}</div><div className="flex flex-wrap gap-2"><Link href="/sessions" className="rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white">Counselor sessions</Link><Link href="/support" className="rounded-xl border border-hair bg-white px-4 py-2.5 text-xs font-semibold text-ink">Contact your team</Link></div></div></section> : null}

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {([
            ["/counselor", GraduationCap, "Noodles", "Continue your counseling conversation"],
            ["/colleges", BriefcaseBusiness, "My Colleges", "Selected universities and their requirements checklists"],
            ["/applications", BriefcaseBusiness, "Applications", `${data.activeApplications.length} active application${data.activeApplications.length === 1 ? "" : "s"}`],
            ["/offers", GraduationCap, "Offers & decisions", `${data.offers.length} recorded offer${data.offers.length === 1 ? "" : "s"}`],
            ["/visa", PlaneTakeoff, "Visa centre", data.offers.length ? "Post-offer visa checklist and next actions" : "Opens when an offer is recorded"],
            ["/documents", Upload, "Documents", `${data.documentCount} document${data.documentCount === 1 ? "" : "s"} stored`],
            ["/payments", CreditCard, "Payments", `${data.pendingPayments.length + data.pendingApplicationFees.length} item${data.pendingPayments.length + data.pendingApplicationFees.length === 1 ? "" : "s"} pending`],
            ["/companion/connect", Download, "SOUP Companion", "Download the app for on-portal application help"],
            ["/notifications", Bell, "Updates", `${data.notifications.filter((item) => !item.readAt).length} unread`],
            ["/support", LifeBuoy, "Help & support", "Message SOUP or open an existing request"],
          ] satisfies Array<[string, LucideIcon, string, string]>).map(([href, Icon, title, note]) => <Link key={href} href={href} className="group flex items-start gap-3 rounded-2xl border border-hair bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-sm"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF0F5]"><Icon size={15} className="text-navy"/></div><div><div className="text-xs font-semibold text-ink">{title}</div><div className="mt-1 text-[11px] leading-4 text-mute">{note}</div></div></Link>)}
        </section>

        <section className="mt-5 rounded-2xl border border-hair bg-white p-5">
          <div className="flex items-center justify-between"><div><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Recent updates</div><h2 className="mt-1 text-sm font-semibold text-ink">What changed in your case</h2></div><Link href="/notifications" className="text-xs font-semibold text-navy">View all</Link></div>
          <div className="mt-4 divide-y divide-hair">{data.notifications.length ? data.notifications.slice(0, 5).map((item) => <Link key={item.id} href={item.href || "/notifications"} className="block py-3 first:pt-0 last:pb-0"><div className="text-xs font-semibold text-ink">{item.title}</div><div className="mt-1 text-[11px] leading-4 text-mute">{item.body}</div></Link>) : <div className="text-xs text-mute">No case updates yet.</div>}</div>
        </section>
      </main>
    </div>
  );
}
