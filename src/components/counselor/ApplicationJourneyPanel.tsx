"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Circle, FileText, Route, Sparkles, UploadCloud } from "lucide-react";

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
  const [expanded, setExpanded] = useState(false);
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

  return (
    <div className="border-b border-hair bg-white/95 px-4 py-2.5 backdrop-blur sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink"><Route size={14} className="text-teal"/>Your journey</div>
              <span className="rounded-full bg-[#EAF0F5] px-2.5 py-1 text-[10px] font-semibold text-navy">{currentStage}</span>
              {status.pendingDocument && <span className="rounded-full bg-[#FFF7DF] px-2.5 py-1 text-[10px] font-semibold text-[#80651A]">Action required</span>}
            </div>
            <div className="mt-1 truncate text-[11px] leading-5 text-mute">{status.nextAction}</div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/applications" className="rounded-full border border-hair bg-white px-3 py-1.5 text-[10px] font-semibold text-ink hover:border-navy">{applications.length} application{applications.length === 1 ? "" : "s"}</Link>
            <Link href="/documents" className="rounded-full border border-hair bg-white px-3 py-1.5 text-[10px] font-semibold text-ink hover:border-navy">{status.documents} document{status.documents === 1 ? "" : "s"}</Link>
            <button onClick={() => setExpanded((value) => !value)} className="inline-flex items-center gap-1 rounded-full bg-paper px-3 py-1.5 text-[10px] font-semibold text-navy hover:bg-[#EAF0F5]">{expanded ? "Hide details" : "View status"}{expanded ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}</button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-4 gap-1 sm:grid-cols-8">
              {STAGES.map(([key, label, href], index) => {
                const done = index < currentIndex;
                const active = index === currentIndex;
                return <Link key={key} href={href} title={`Open ${label}`} className={`rounded-lg px-2 py-1.5 transition hover:ring-1 hover:ring-navy/20 ${active ? "bg-[#EAF0F5]" : "bg-paper"}`}><div className="flex items-center gap-1.5">{done ? <Check size={10} className="text-teal"/> : <Circle size={8} className={active ? "fill-navy text-navy" : "text-[#B8C0C7]"}/>}<span className={`truncate text-[9px] font-semibold ${active ? "text-navy" : done ? "text-teal" : "text-mute"}`}>{label}</span></div></Link>;
              })}
            </div>
            {signedIn && (
              <div className="grid gap-2 lg:grid-cols-2">
                <div className="rounded-xl border border-hair bg-paper/70 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.12em] text-teal"><Sparkles size={11}/>What SOUP is doing</div>
                  <div className="mt-1.5 text-[11px] leading-5 text-ink">{status.whatSoupIsDoing || "Keeping your student journey up to date."}</div>
                </div>
                <div className={`rounded-xl border p-3 ${status.pendingDocument ? "border-[#D8C89C] bg-[#FFFDF7]" : "border-hair bg-paper/70"}`}>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.12em] text-navy">{status.pendingDocument ? <UploadCloud size={11}/> : <Check size={11}/>}What you need to do</div>
                  <div className="mt-1.5 text-[11px] leading-5 text-ink">{status.pendingDocument ? `Upload ${status.pendingDocument.label}${status.pendingDocument.university ? ` for ${status.pendingDocument.university}` : ""}. The upload action appears directly below the Counselor.` : status.nextAction || "Continue with Noodles."}</div>
                </div>
              </div>
            )}

            {applications.length > 0 && <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {applications.slice(0, 6).map((application) => (
                <Link key={application.id} href={`/applications/${application.id}`} className="rounded-xl border border-hair bg-white p-3 transition hover:border-navy/30 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-[11px] font-semibold text-ink">{application.university}</div>{application.program && <div className="mt-0.5 truncate text-[10px] text-mute">{application.program}</div>}</div><span className="shrink-0 rounded-full bg-paper px-2 py-1 text-[9px] font-semibold text-navy">{application.ownership === "SOUP_MANAGED" ? "SOUP-managed" : "Guided"}</span></div>
                  <div className="mt-2 flex items-center justify-between text-[10px]"><span className="font-medium text-mute">{application.statusLabel}</span>{application.progress !== null && application.progress !== undefined ? <span className="font-semibold text-ink">{application.progress}% ready</span> : null}</div>
                  {application.progress !== null && application.progress !== undefined && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper"><div className="h-full rounded-full bg-teal transition-all" style={{ width: `${Math.max(3, Math.min(100, application.progress))}%` }}/></div>}
                  {application.nextRequirement && <div className="mt-2 flex items-start gap-1.5 text-[10px] leading-4 text-mute"><FileText size={10} className="mt-0.5 shrink-0"/>Next: {application.nextRequirement}</div>}
                </Link>
              ))}
            </div>}

            {signedIn && known.length > 0 && <div className="rounded-xl border border-hair bg-white p-3"><div className="mb-2 text-[10px] font-semibold uppercase tracking-[.12em] text-mute">Information SOUP already has</div><div className="flex flex-wrap gap-1.5">{known.map(([key, value]) => <span key={key} className="rounded-full border border-hair px-2 py-1 text-[9px] text-mute"><strong className="font-semibold text-ink">{key}:</strong> {value}</span>)}</div></div>}
          </div>
        )}
      </div>
    </div>
  );
}
