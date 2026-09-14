"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, FileUp, LockKeyhole } from "lucide-react";
import { ConversationWorkspace } from "@/components/conversation/ConversationWorkspace";
import type { ConversationMessage } from "@/lib/conversation/types";

type FinancialMode = "FINANCIAL_ONLY" | "INTEGRATED";

export function FinancialConversation({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const modeChosen = useRef(false);
  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [evidenceRequested, setEvidenceRequested] = useState(false);
  const [mode, setMode] = useState<FinancialMode>("FINANCIAL_ONLY");
  const [snapshot, setSnapshot] = useState<{ snapshotId: string; pageCount: number; version: number } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("gci_financial_report_mode_v1");
    if (stored === "INTEGRATED" || stored === "FINANCIAL_ONLY") setMode(stored);
    if (signedIn) {
      fetch("/api/financial/preference").then((r) => r.ok ? r.json() : null).then((body) => { if (body?.mode === "INTEGRATED" || body?.mode === "FINANCIAL_ONLY") { setMode(body.mode); modeChosen.current = true; localStorage.setItem("gci_financial_report_mode_v1", body.mode); } }).catch(() => undefined);
    }
  }, [signedIn]);
  function chooseMode(next: FinancialMode, explicit = true) {
    if (explicit) modeChosen.current = true;
    setMode(next); localStorage.setItem("gci_financial_report_mode_v1", next);
    if (signedIn) fetch("/api/financial/preference", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: next }) }).catch(() => undefined);
  }
  function handleMessages(messages: ConversationMessage[]) {
    setEvidenceRequested(messages.some((message) => message.role === "assistant" && message.content.includes("[[EVIDENCE_REQUESTED]]")));
    const result = [...messages].reverse().map((message) => message.content.match(/\[\[FINANCIAL_RESULT:([^:]+):(\d+):(\d+)\]\]/)).find(Boolean);
    if (result) setSnapshot({ snapshotId: result[1], pageCount: Number(result[2]), version: Number(result[3]) });
    if (!modeChosen.current) {
      const latestUser = [...messages].reverse().find((m) => m.role === "user")?.content.toLowerCase() || "";
      if (/full integrated|integrated gci/.test(latestUser)) { modeChosen.current = true; chooseMode("INTEGRATED", false); }
      else if (/financial-only|financial only/.test(latestUser)) { modeChosen.current = true; chooseMode("FINANCIAL_ONLY", false); }
    }
  }
  function requestUpload() {
    if (!evidenceRequested) return;
    if (!signedIn) { router.push(`/sign-up?next=${encodeURIComponent("/financial?continue=1")}`); return; }
    fileRef.current?.click();
  }
  async function processFile(file: File) {
    setProcessing(true); setNotice(`Reading ${file.name}...`);
    try {
      const form = new FormData(); form.append("file", file); form.append("workflow", "FINANCIAL");
      const response = await fetch("/api/evidence/process", { method: "POST", body: form });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "Could not process financial evidence.");
      const analysis = body.analysis || {};
      const detail = [analysis.summary, analysis.possibleInconsistencies?.length ? `Possible inconsistencies: ${analysis.possibleInconsistencies.join("; ")}` : "", analysis.missingOrUnclear?.length ? `Still unclear: ${analysis.missingOrUnclear.join("; ")}` : "", analysis.nextSuggestedEvidence ? `Next useful evidence: ${analysis.nextSuggestedEvidence}` : ""].filter(Boolean).join("\n\n");
      window.dispatchEvent(new CustomEvent("gci:conversation-append", { detail: { workflow: "FINANCIAL", message: { id: crypto.randomUUID(), role: "assistant", content: `I’ve processed ${file.name}.\n\n${detail}`, createdAt: new Date().toISOString(), kind: "evidence", metadata: { documentId: body.documentId } } } }));
      setEvidenceRequested(true); setNotice(`${file.name} processed.`);
    } catch (caught) { setNotice(caught instanceof Error ? caught.message : "Could not process financial evidence."); }
    finally { setProcessing(false); }
  }
  async function finalize() {
    if (!signedIn) { router.push(`/sign-up?next=${encodeURIComponent("/financial?continue=1")}`); return; }
    setFinalizing(true); setNotice(null);
    try {
      const response = await fetch("/api/financial/finalize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || (body.readiness?.reasons || []).join(" ") || "Could not prepare Financial & Valuation report.");
      setSnapshot(body);
      window.dispatchEvent(new CustomEvent("gci:conversation-append", { detail: { workflow: "FINANCIAL", message: { id: crypto.randomUUID(), role: "assistant", content: `Your ${body.pageCount}-page ${body.kind === "FINANCIAL_STANDALONE" ? "standalone" : "integrated"} Financial & Valuation report is ready as snapshot v${body.version}.\n[[FINANCIAL_RESULT:${body.snapshotId}:${body.pageCount}:${body.version}]]`, createdAt: new Date().toISOString(), kind: "result", metadata: { snapshotId: body.snapshotId } } } }));
    } catch (caught) { setNotice(caught instanceof Error ? caught.message : "Could not prepare report."); }
    finally { setFinalizing(false); }
  }

  return <>
    <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.docx" className="hidden" onChange={async (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) await processFile(file); }}/>
    <div className="mx-auto w-full max-w-5xl px-3 pt-3 sm:px-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-mute"><span className="mr-1">Report mode:</span><button onClick={() => chooseMode("FINANCIAL_ONLY")} className={`rounded-full border px-3 py-1.5 font-semibold ${mode === "FINANCIAL_ONLY" ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink"}`}>Financial only · 2 pages</button><button onClick={() => chooseMode("INTEGRATED")} className={`rounded-full border px-3 py-1.5 font-semibold ${mode === "INTEGRATED" ? "border-navy bg-navy text-white" : "border-hair bg-white text-ink"}`}>Integrated GCI · 5 pages</button></div>
    </div>
    <ConversationWorkspace workflow="FINANCIAL" signedIn={signedIn} title="Financial & Valuation" subtitle={signedIn ? "Talk through the objective, add evidence progressively, and let GCI keep the financial picture consistent." : "Start as a guest. Your account is needed only when GCI asks for your first private financial or property document."} onAttach={evidenceRequested ? requestUpload : undefined} onMessagesChange={handleMessages} onReset={() => { setEvidenceRequested(false); setSnapshot(null); setNotice(null); }} bottomAction={evidenceRequested ? (
      <div className="rounded-2xl border border-hair bg-white p-4"><div className="flex items-start gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF3F7] text-navy"><Building2 size={14}/></div><div className="flex-1"><div className="text-xs font-semibold text-ink">GCI is ready for financial/property evidence</div><p className="mt-1 text-[11px] leading-5 text-mute">Attach the document GCI requested. Evidence is processed one item at a time and the final report is blocked until the evidence set is sufficiently ready.</p>{notice && <p className="mt-2 text-[11px] font-medium text-teal">{notice}</p>}</div><div className="flex flex-wrap gap-2"><button onClick={requestUpload} disabled={processing} className="inline-flex items-center gap-1.5 rounded-full border border-hair px-3 py-2 text-xs font-semibold text-ink disabled:opacity-60">{processing ? "Processing…" : signedIn ? <><FileUp size={12}/> Attach evidence</> : <><LockKeyhole size={12}/> Sign in to upload</>}</button>{signedIn && <button onClick={finalize} disabled={finalizing} className="rounded-full bg-navy px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{finalizing ? "Checking readiness…" : "I’m done — prepare my report"}</button>}{snapshot && <a href={`/api/export/financial-snapshot?id=${snapshot.snapshotId}`} className="rounded-full border border-teal px-3 py-2 text-xs font-semibold text-teal">Download {snapshot.pageCount}-page PDF</a>}</div></div></div>
    ) : null}/>
  </>;
}
