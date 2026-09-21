"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileUp, GraduationCap, Loader2, LockKeyhole, Sparkles, ShieldCheck, X } from "lucide-react";
import { ConversationWorkspace } from "@/components/conversation/ConversationWorkspace";
import { ApplicationJourneyPanel, type JourneyStatus } from "@/components/counselor/ApplicationJourneyPanel";
import type { ConversationMessage } from "@/lib/conversation/types";


type LinkedJourneyResult = {
  attached?: boolean;
  ambiguous?: boolean;
  message?: string;
  nextItem?: {
    title: string;
    requiresDocument?: boolean;
    externalActionUrl?: string | null;
    externalActionLabel?: string | null;
  } | null;
};

const INTENT_COPY: Record<string, { intro: string; starters: string[]; title: string }> = {
  universities: {
    title: "Universities & Programs",
    intro: "Tell me what you want to study and what your academic background looks like. I’ll also ask which region you want to focus on before I narrow the university search.",
    starters: ["I need a bachelor’s in business", "Help me find a master’s in Europe", "I’m open to universities worldwide"],
  },
  accommodation: {
    title: "Accommodation",
    intro: "Tell me where you are studying or planning to study, your dates and your monthly budget. I can use SOUP partner options first where they fit and also explain independent alternatives.",
    starters: ["I already have an offer and need housing", "Find accommodation near my university", "Help me understand my housing budget"],
  },
  insurance: {
    title: "Student Insurance",
    intro: "Tell me your destination, study/visa stage and the kind of cover you need. I can compare suitable options; insurance purchased through SOUP follows our active insurance partner channel.",
    starters: ["I need insurance for my student visa", "What insurance do I need before travel?", "Help me compare student health cover"],
  },
  scholarships: {
    title: "Scholarships",
    intro: "Tell me your study level, subject, destination or region, academic background and budget. I’ll help narrow scholarships that are relevant to your situation.",
    starters: ["Find scholarships for a bachelor’s", "I need funding for Europe", "Show me scholarships I may be eligible for"],
  },
  finance: {
    title: "Student Finance",
    intro: "Tell me what you need help financing — tuition, proof of funds, payments or another part of your study journey — and where you plan to study.",
    starters: ["I need help planning tuition payments", "What proof of funds will I need?", "Show me student finance options"],
  },
};

function latestAssistant(messages: ConversationMessage[]) {
  return [...messages].reverse().find((message) => message.role === "assistant")?.content || "";
}

// Dismissed document-request labels for this browser tab session — cleared
// automatically when the tab/browser session ends, per the dismiss control's
// own "for the current session" scope. Kept separate from the persisted
// server-side note (see /api/counselor/dismiss-document): this is what stops
// the card reappearing in THIS tab; the server note is what stops Noodles
// itself re-asking in a future reply.
const DISMISSED_DOCS_STORAGE_KEY = "soup_dismissed_document_requests_v1";

// Pure decision for the composer's attach affordance, kept separate from the
// component so it is directly testable: a signed-in student always gets the
// real file picker (the affordance is general now, not only when Noodles has
// asked for a specific document); a guest is never allowed to open the
// picker for a sensitive application document and is instead sent through
// the existing sign-up flow, preserving whatever request/checklist/application
// context is available so they land back where they were after creating an
// account.
export function resolveAttachAction(params: {
  signedIn: boolean;
  intent?: string;
  effectiveChecklistItemId?: string;
  documentLabel?: string | null;
  effectiveApplicationId?: string;
}): { type: "open-picker" } | { type: "redirect"; url: string } {
  if (params.signedIn) return { type: "open-picker" };
  const query = new URLSearchParams();
  if (params.intent) query.set("intent", params.intent);
  if (params.effectiveChecklistItemId) query.set("requestItem", params.effectiveChecklistItemId);
  if (params.documentLabel) query.set("requestLabel", params.documentLabel);
  if (params.effectiveApplicationId) query.set("applicationId", params.effectiveApplicationId);
  const next = `/counselor${query.toString() ? `?${query.toString()}` : ""}`;
  return { type: "redirect", url: `/sign-up?reason=attach-document&next=${encodeURIComponent(next)}` };
}

export function CounselorConversation({ signedIn, intent, requestedItemId, requestedLabel, applicationId, initialPrompt, entryUniversityId }: { signedIn: boolean; intent?: string; requestedItemId?: string; requestedLabel?: string; applicationId?: string; initialPrompt?: string; entryUniversityId?: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [plan, setPlan] = useState<{ shortlistId: string; version: number; count: number } | null>(null);
  const [checklist, setChecklist] = useState<{ checklistId: string; title: string; count: number } | null>(null);
  const [journeyRefresh, setJourneyRefresh] = useState(0);
  const [pendingRequirement, setPendingRequirement] = useState<{ itemId: string; label: string; applicationId?: string; university?: string } | null>(null);
  const [dismissedLabels, setDismissedLabels] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DISMISSED_DOCS_STORAGE_KEY);
      if (raw) setDismissedLabels(new Set(JSON.parse(raw) as string[]));
    } catch {}
  }, []);

  const dismissDocumentRequest = useCallback((label: string) => {
    const key = label.trim().toLowerCase();
    setDismissedLabels((prev) => {
      const next = new Set(prev);
      next.add(key);
      try { sessionStorage.setItem(DISMISSED_DOCS_STORAGE_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
    if (signedIn) {
      fetch("/api/counselor/dismiss-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSessionId, documentLabel: label }),
      }).catch(() => undefined);
    }
  }, [signedIn, activeSessionId]);

  const copy = intent && INTENT_COPY[intent] ? INTENT_COPY[intent] : {
    title: "Noodles",
    intro: "Tell me what you need help with. I can stay with you from university search through applications, documents, visa preparation and pre-departure.",
    starters: ["Help me find universities", "I already have an offer and need next steps", "Help me prepare for my visa"],
  };

  const last = useMemo(() => latestAssistant(messages), [messages]);
  const aiDocumentLabel = last.match(/\[\[DOCUMENT_REQUEST:([^\]]+)\]\]/)?.[1]?.trim() || null;
  const rawDocumentLabel = aiDocumentLabel || requestedLabel || pendingRequirement?.label || null;
  const documentLabel = rawDocumentLabel && dismissedLabels.has(rawDocumentLabel.trim().toLowerCase()) ? null : rawDocumentLabel;
  const effectiveChecklistItemId = requestedItemId || pendingRequirement?.itemId || undefined;
  const effectiveApplicationId = applicationId || pendingRequirement?.applicationId || undefined;
  const applicationPlanReady = last.includes("[[APPLICATION_PLAN_READY]]");
  const checklistKind = last.includes("[[CHECKLIST_READY:VISA]]")
    ? "VISA"
    : last.includes("[[CHECKLIST_READY:PRE_DEPARTURE]]")
      ? "PRE_DEPARTURE"
      : null;
  const insurancePartnerRoute = last.includes("[[PARTNER_ROUTE:INSURANCE]]");
  const servicePartnerRoute = last.match(/\[\[PARTNER_ROUTE:(ACCOMMODATION|STUDENT_FINANCE|SCHOLARSHIP)\]\]/)?.[1] || null;

  const handleJourneyStatus = useCallback((status: JourneyStatus) => {
    setPendingRequirement(status?.pendingDocument || null);
  }, []);

  function requestUpload() {
    const action = resolveAttachAction({ signedIn, intent, effectiveChecklistItemId, documentLabel, effectiveApplicationId });
    if (action.type === "redirect") {
      router.push(action.url);
      return;
    }
    setNotice(null);
    fileRef.current?.click();
  }

  async function createPlan() {
    if (!signedIn) {
      const next = `/counselor${intent ? `?intent=${encodeURIComponent(intent)}` : ""}`;
      router.push(`/sign-up?next=${encodeURIComponent(next)}`);
      return;
    }
    setFinalizing(true); setNotice(null);
    try {
      const response = await fetch("/api/counselor/application-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSessionId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not create your application plan.");
      setPlan(body);
      setJourneyRefresh((value) => value + 1);
      window.dispatchEvent(new CustomEvent("soup:conversation-append", { detail: { workflow: "COUNSELOR", message: { id: crypto.randomUUID(), role: "assistant", content: `Your University Application Plan v${body.version} is saved in My SOUP with ${body.count} university option${body.count === 1 ? "" : "s"}. You can download the PDF below.`, createdAt: new Date().toISOString(), kind: "result", metadata: { shortlistId: body.shortlistId } } } }));
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not create your application plan.");
    } finally { setFinalizing(false); }
  }

  async function createChecklist() {
    if (!checklistKind) return;
    if (!signedIn) {
      const next = `/counselor${intent ? `?intent=${encodeURIComponent(intent)}` : ""}`;
      router.push(`/sign-up?next=${encodeURIComponent(next)}`);
      return;
    }
    setFinalizing(true); setNotice(null);
    try {
      const response = await fetch("/api/counselor/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: checklistKind, sessionId: activeSessionId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not create your journey checklist.");
      setChecklist(body);
      setJourneyRefresh((value) => value + 1);
      const first = body.firstItem;
      const firstStep = first
        ? first.requiresDocument
          ? `\n\nLet’s do this one item at a time. First: **${first.title}**. Please upload it when you’re ready.\n\n[[DOCUMENT_REQUEST:${first.title}]]`
          : first.externalActionUrl
            ? `\n\nYour first action is **${first.title}**. ${first.externalActionLabel || "Open the official instructions"}: ${first.externalActionUrl}`
            : `\n\nYour first action is **${first.title}**. I’ll keep tracking it in your SOUP journey.`
        : "";
      window.dispatchEvent(new CustomEvent("soup:conversation-append", { detail: { workflow: "COUNSELOR", message: { id: crypto.randomUUID(), role: "assistant", content: `${body.title} is saved with ${body.count} trackable requirement${body.count === 1 ? "" : "s"}.${firstStep}`, createdAt: new Date().toISOString(), kind: "result", metadata: { checklistId: body.checklistId } } } }));
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not create your journey checklist.");
    } finally { setFinalizing(false); }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.docx" className="hidden" onChange={async (event) => {
        const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
        setProcessing(true); setNotice(`Reading ${file.name}...`);
        try {
          const form = new FormData(); form.append("file", file); form.append("workflow", "COUNSELOR");
          const response = await fetch("/api/evidence/process", { method: "POST", body: form });
          const body = await response.json(); if (!response.ok) throw new Error(body.error || "Could not process document.");
          let linkedJourney: LinkedJourneyResult | null = null;
          if (documentLabel && body.documentId) {
            const linkedResponse = await fetch("/api/journey/attach-document", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ documentId: body.documentId, requestedLabel: documentLabel, checklistItemId: effectiveChecklistItemId, applicationId: effectiveApplicationId }),
            }).catch(() => null);
            if (linkedResponse?.ok) linkedJourney = await linkedResponse.json().catch(() => null) as LinkedJourneyResult | null;
          }
          const analysis = body.analysis || {};
          const details = [
            analysis.summary,
            analysis.missingOrUnclear?.length ? `Still unclear: ${analysis.missingOrUnclear.join("; ")}` : "",
          ].filter(Boolean).join("\n\n");
          const next = linkedJourney?.nextItem;
          const ambiguousNote = linkedJourney?.ambiguous
            ? `\n\n${linkedJourney.message || "The file is saved, but I need you to open the exact application/checklist before I bind it to a requirement."}`
            : "";
          const nextStep = next
            ? next.requiresDocument
              ? `\n\nThat item is now recorded as supplied in SOUP. Next I need **${next.title}**.\n\n[[DOCUMENT_REQUEST:${next.title}]]`
              : next.externalActionUrl
                ? `\n\nThat item is now recorded as supplied in SOUP. Your next action is **${next.title}**. ${next.externalActionLabel || "Official instructions"}: ${next.externalActionUrl}`
                : `\n\nThat item is now recorded as supplied in SOUP. Next: **${next.title}**.`
            : linkedJourney?.attached
              ? "\n\nThat was the last currently open item in this saved checklist. You can review the full journey in My SOUP."
              : "";
          const supplyStatement = linkedJourney?.attached
            ? "This item is now recorded as supplied in SOUP; it does not mean an embassy, university or other authority has formally accepted it."
            : "The document is saved in your SOUP vault as supporting information; it has not been marked against a specific requirement unless SOUP could identify that requirement unambiguously.";
          window.dispatchEvent(new CustomEvent("soup:conversation-append", { detail: { workflow: "COUNSELOR", message: { id: crypto.randomUUID(), role: "assistant", content: `I’ve read ${file.name}.\n\n${details}\n\n${supplyStatement}${ambiguousNote}${nextStep}`, createdAt: new Date().toISOString(), kind: "evidence", metadata: { documentId: body.documentId } } } }));
          setNotice(`${file.name} is saved in your document vault.`);
          setJourneyRefresh((value) => value + 1);
        } catch (caught) { setNotice(caught instanceof Error ? caught.message : "Could not process document."); }
        finally { setProcessing(false); }
      }}/>
      <ApplicationJourneyPanel signedIn={signedIn} refreshKey={journeyRefresh + messages.length} onStatus={handleJourneyStatus}/>
      <ConversationWorkspace
        workflow="COUNSELOR"
        signedIn={signedIn}
        title={documentLabel ? "Application document" : copy.title}
        subtitle={documentLabel ? `Your application needs ${documentLabel}. Upload it here when you are ready; SOUP will read it, save it to your vault and bind it to the correct application requirement.` : signedIn ? "One conversation layer across universities, applications, documents, visa, accommodation, insurance, finance and scholarships." : "Start as a guest. SOUP asks you to create an account only when private documents or saved case data are needed."}
        intro={copy.intro}
        starters={copy.starters}
        entryIntent={intent}
        entryUniversityId={entryUniversityId}
        initialPrompt={initialPrompt}
        onAttach={requestUpload}
        attachLabel={signedIn ? "Attach a document" : "Sign in to attach a document"}
        onMessagesChange={setMessages}
        onSessionChange={setActiveSessionId}
        onReset={() => { setNotice(null); setPlan(null); setChecklist(null); }}
        bottomAction={documentLabel ? (
          <div className="relative rounded-2xl border border-[#D9C98E] bg-[#FFFDF7] p-4 pr-9 shadow-[0_12px_32px_rgba(20,32,48,0.08)]">
            <button
              onClick={() => dismissDocumentRequest(documentLabel)}
              aria-label={`Dismiss request for ${documentLabel}`}
              title="Dismiss for now"
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-mute hover:bg-black/5 hover:text-ink"
            ><X size={13}/></button>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF3F7] text-navy">{signedIn ? <FileUp size={14}/> : <LockKeyhole size={14}/>}</div>
              <div className="flex-1"><div className="text-xs font-semibold text-ink">{documentLabel}</div><p className="mt-1 text-[11px] leading-5 text-mute">The Noodles asked for this document now because it is relevant to the current step. It will be read and saved in your SOUP document vault.</p>{notice && <p className="mt-2 text-[11px] font-medium text-teal">{notice}</p>}</div>
              <button onClick={requestUpload} disabled={processing} className="rounded-full border border-hair px-3 py-2 text-xs font-semibold text-ink disabled:opacity-60">{processing ? "Processing…" : signedIn ? "Upload document" : "Sign in to upload"}</button>
            </div>
          </div>
        ) : insurancePartnerRoute ? (
          <div className="rounded-2xl border border-hair bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F0F7F5] text-teal"><ShieldCheck size={14}/></div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-ink">Purchase insurance through SOUP</div>
                <p className="mt-1 text-[11px] leading-5 text-mute">SOUP can advise on the wider market. Purchases made through SOUP use our active insuremart insurance partner channel.</p>
              </div>
              <a href="/services/insurance?source=counselor" className="rounded-full bg-navy px-3 py-2 text-xs font-semibold text-white">Continue</a>
            </div>
          </div>
        ) : servicePartnerRoute ? (
          <div className="rounded-2xl border border-hair bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF3F7] text-navy"><Sparkles size={14}/></div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-ink">Continue with a SOUP partner</div>
                <p className="mt-1 text-[11px] leading-5 text-mute">Only active SOUP partner inventory can be transacted through the platform. Independent recommendations stay advisory and external.</p>
              </div>
              <a href={servicePartnerRoute === "ACCOMMODATION" ? "/services/accommodation?source=counselor" : servicePartnerRoute === "STUDENT_FINANCE" ? "/services/finance?source=counselor" : "/services/scholarships?source=counselor"} className="rounded-full bg-navy px-3 py-2 text-xs font-semibold text-white">Continue</a>
            </div>
          </div>
        ) : checklistKind || checklist ? (
          <div className="rounded-2xl border border-hair bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF3F7] text-navy"><Sparkles size={14}/></div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-ink">{checklist ? checklist.title : checklistKind === "VISA" ? "Your visa checklist is ready to build" : "Your pre-departure checklist is ready to build"}</div>
                <p className="mt-1 text-[11px] leading-5 text-mute">{checklist ? `${checklist.count} requirements are saved in your SOUP journey and can be completed one by one.` : "SOUP will research the current official requirements for your circumstances, save the source, and turn them into a trackable checklist."}</p>
                {notice && <p className="mt-2 text-[11px] font-medium text-teal">{notice}</p>}
              </div>
              {checklist ? (
                <a href="/journey" className="rounded-full border border-teal px-3 py-2 text-xs font-semibold text-teal">View journey</a>
              ) : (
                <button onClick={createChecklist} disabled={finalizing} className="inline-flex items-center gap-2 rounded-full bg-navy px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{finalizing ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} {finalizing ? "Checking official sources…" : signedIn ? "Save checklist" : "Sign in to save"}</button>
              )}
            </div>
          </div>
        ) : applicationPlanReady || plan ? (
          <div className="rounded-2xl border border-hair bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F0F7F5] text-teal">{plan ? <Download size={14}/> : <GraduationCap size={14}/>}</div>
              <div className="flex-1"><div className="text-xs font-semibold text-ink">{plan ? `University Application Plan v${plan.version}` : "Your shortlist is ready to save"}</div><p className="mt-1 text-[11px] leading-5 text-mute">{plan ? `${plan.count} suitable university option${plan.count === 1 ? "" : "s"} saved to your dashboard.` : "SOUP can now research and save the final application plan with current source-backed university information."}</p>{notice && <p className="mt-2 text-[11px] font-medium text-teal">{notice}</p>}</div>
              <div className="flex gap-2">{!plan && <button onClick={createPlan} disabled={finalizing} className="inline-flex items-center gap-2 rounded-full bg-navy px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{finalizing ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} {finalizing ? "Researching…" : signedIn ? "Save application plan" : "Sign in to save"}</button>}{plan && <a href={`/api/export/application-plan?id=${encodeURIComponent(plan.shortlistId)}`} className="inline-flex items-center gap-2 rounded-full border border-teal px-3 py-2 text-xs font-semibold text-teal"><Download size={12}/> Download PDF</a>}</div>
            </div>
          </div>
        ) : notice ? <div className="rounded-xl border border-hair bg-white px-4 py-3 text-xs text-mute">{notice}</div> : null}
      />
    </div>
  );
}
