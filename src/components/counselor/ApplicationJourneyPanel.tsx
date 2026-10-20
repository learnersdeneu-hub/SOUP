"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FileText, Sparkles, UploadCloud } from "lucide-react";

const STAGES = [
  ["EXPLORING", "Profile", "/dashboard"],
  ["SHORTLISTING", "Shortlist", "/universities"],
  ["APPLYING", "Applications", "/applications"],
  ["AWAITING_DECISIONS", "Decisions", "/applications"],
  ["OFFER_RECEIVED", "Offer", "/applications"],
  ["VISA_PREPARATION", "Visa", "/journey"],
  ["PRE_DEPARTURE", "Pre-departure", "/journey"],
  ["ARRIVED", "Arrived", "/journey"],
] as const;

type PendingDocument = { itemId: string; label: string; applicationId?: string; university?: string };
type ApplicationSummary = {
  id: string;
  universityId?: string | null;
  university: string;
  program?: string | null;
  ownership: string;
  status: string;
  statusLabel: string;
  progress?: number | null;
  completedRequirements?: number;
  totalRequirements?: number;
  nextRequirement?: string | null;
};
export type JourneyStatus = {
  stage: string;
  completed: number;
  total: number;
  documents: number;
  applications?: ApplicationSummary[];
  checklistTitle?: string | null;
  nextAction?: string;
  whatSoupIsDoing?: string;
  pendingDocument?: PendingDocument | null;
  known?: Record<string, string | null>;
};

export function ApplicationJourneyPanel({ signedIn, refreshKey, onStatus }: { signedIn: boolean; refreshKey: number; onStatus?: (status: JourneyStatus) => void }) {
  const [status, setStatus] = useState<JourneyStatus>({ stage: "EXPLORING", completed: 0, total: 0, documents: 0, nextAction: "Tell SOUP what you want to study and where.", whatSoupIsDoing: "Building your student profile from this conversation." });

  useEffect(() => {
    let active = true;
    fetch("/api/counselor/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((body) => {
        if (!active || body.error) return;
        setStatus(body);
        onStatus?.(body);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [refreshKey, onStatus]);

  const currentIndex = Math.max(0, STAGES.findIndex(([key]) => key === status.stage));
  const currentStage = STAGES[currentIndex]?.[1] || "Profile";
  const known = useMemo(() => Object.entries(status.known || {}).filter(([, value]) => Boolean(value)), [status.known]);
  const applications = Array.isArray(status.applications) ? status.applications : [];

  // A persistent right-hand "Your case" sidebar (see ConversationWorkspace's
  // rightPanel slot) rather than the collapsible top status bar this used to
  // be — matches the "SOUP Homepage Redesign" design canvas's Noodles chat
  // layout. Same /api/counselor/status data throughout, just always
  // visible instead of gated behind a "View status" toggle.
  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between"><h2 className="m-0 text-base font-extrabold text-ink">Your case</h2><Link href="/dashboard" className="text-[13px] font-bold text-navy no-underline">Open My SOUP</Link></div>
        <div aria-hidden="true" className="grid grid-cols-8 gap-[3px]">
          {STAGES.map(([key], index) => {
            const done = index < currentIndex;
            const active = index === currentIndex;
            return <span key={key} className={`h-1.5 rounded-sm ${done ? "bg-teal" : active ? "bg-navy" : "bg-hair"}`}/>;
          })}
        </div>
        <span className="text-[13px] text-mute">Stage {currentIndex + 1} of {STAGES.length}: <strong className="text-ink">{currentStage}</strong></span>
      </div>

      <div className={`flex flex-col gap-1 rounded-[14px] border p-3.5 ${status.pendingDocument ? "border-[#F1E2A8] bg-[#FFF8E1]" : "border-hair bg-paper"}`}>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B5000]">{status.pendingDocument ? <><UploadCloud size={11} className="mr-1 inline"/>You need to do</> : "What&rsquo;s next"}</span>
        <span className="text-sm font-bold text-ink">{status.pendingDocument ? `Upload ${status.pendingDocument.label}` : status.nextAction || "Continue with Noodles."}</span>
        {status.pendingDocument?.university && <span className="text-[13px] text-mute">for {status.pendingDocument.university}</span>}
      </div>

      {signedIn && (
        <div className="flex items-start gap-2 rounded-[14px] border border-hair bg-paper p-3.5 text-[13px] leading-5 text-ink">
          <Sparkles size={13} className="mt-0.5 shrink-0 text-teal"/>
          {status.whatSoupIsDoing || "Keeping your student journey up to date."}
        </div>
      )}

      {applications.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className="mb-1.5 text-[13px] font-extrabold text-ink">Applications ({applications.length})</span>
          {applications.slice(0, 6).map((application) => (
            <Link key={application.id} href={`/applications/${application.id}`} className="flex items-center justify-between gap-2 border-b border-[#EEF0EC] py-2 text-ink no-underline last:border-0">
              <span className="truncate text-[13px] font-semibold">{application.university}</span>
              <span className="shrink-0 rounded-md bg-paper px-2 py-1 text-[11px] font-bold text-navy">{application.progress !== null && application.progress !== undefined ? `${application.progress}% · ${application.statusLabel}` : application.statusLabel}</span>
            </Link>
          ))}
          {applications.length > 6 && <Link href="/applications" className="pt-1.5 text-[13px] font-bold text-navy no-underline">+{applications.length - 6} more</Link>}
        </div>
      )}
      {applications.some((application) => application.nextRequirement) && (
        <div className="flex items-start gap-1.5 text-[12px] leading-4 text-mute"><FileText size={11} className="mt-0.5 shrink-0"/>Next: {applications.find((application) => application.nextRequirement)?.nextRequirement}</div>
      )}

      {signedIn && known.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between"><span className="text-[13px] font-extrabold text-ink">What Noodles knows</span></div>
          <div className="flex flex-wrap gap-1.5">
            {known.map(([key, value]) => <span key={key} className="rounded-lg bg-paper px-2.5 py-1.5 text-[12px] font-semibold text-ink">{value}</span>)}
          </div>
        </div>
      )}

      <Link href="/documents" className="text-[13px] font-semibold text-mute no-underline">{status.documents} document{status.documents === 1 ? "" : "s"} saved</Link>
    </div>
  );
}
