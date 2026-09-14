"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LockKeyhole } from "lucide-react";
import { ConversationWorkspace } from "@/components/conversation/ConversationWorkspace";
import type { ConversationMessage } from "@/lib/conversation/types";

export function ReportConversation({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [evidenceRequested, setEvidenceRequested] = useState(false);
  const [snapshot, setSnapshot] = useState<{ snapshotId: string; version: number } | null>(null);

  function handleMessages(messages: ConversationMessage[]) {
    setEvidenceRequested(messages.some((message) => message.role === "assistant" && message.content.includes("[[EVIDENCE_REQUESTED]]")));
    const result = [...messages].reverse().map((message) => message.content.match(/\[\[REPORT_RESULT:([^:]+):(\d+)\]\]/)).find(Boolean);
    if (result) setSnapshot({ snapshotId: result[1], version: Number(result[2]) });
  }

  function requestUpload() {
    if (!evidenceRequested) return;
    if (!signedIn) {
      router.push(`/sign-up?next=${encodeURIComponent("/report?continue=1")}`);
      return;
    }
    setNotice(null);
    fileRef.current?.click();
  }

  async function finalize() {
    if (!signedIn) { router.push(`/sign-up?next=${encodeURIComponent("/report?continue=1")}`); return; }
    setFinalizing(true); setNotice(null);
    try {
      const response = await fetch("/api/report/finalize", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || (body.readiness?.reasons || []).join(" ") || "Could not prepare GCI package.");
      setSnapshot(body);
      window.dispatchEvent(new CustomEvent("gci:conversation-append", { detail: { workflow: "REPORT", message: { id: crypto.randomUUID(), role: "assistant", content: `Your Complete GCI package snapshot v${body.version} is ready. I used the evidence processed in this journey and kept unresolved items separate from verified findings.\n[[REPORT_RESULT:${body.snapshotId}:${body.version}]]`, createdAt: new Date().toISOString(), kind: "result", metadata: { snapshotId: body.snapshotId } } } }));
    } catch (caught) { setNotice(caught instanceof Error ? caught.message : "Could not prepare GCI package."); }
    finally { setFinalizing(false); }
  }

  return (
    <>
      <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.docx" className="hidden" onChange={async (event) => {
        const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
        setProcessing(true); setNotice(`Reading ${file.name}...`);
        try {
          const form = new FormData(); form.append("file", file); form.append("workflow", "REPORT");
          const response = await fetch("/api/evidence/process", { method: "POST", body: form });
          const body = await response.json(); if (!response.ok) throw new Error(body.error || "Could not process document.");
          const analysis = body.analysis || {};
          const detail = [analysis.summary, analysis.possibleInconsistencies?.length ? `Possible inconsistencies: ${analysis.possibleInconsistencies.join("; ")}` : "", analysis.nextSuggestedEvidence ? `Next useful evidence: ${analysis.nextSuggestedEvidence}` : ""].filter(Boolean).join("\n\n");
          window.dispatchEvent(new CustomEvent("gci:conversation-append", { detail: { workflow: "REPORT", message: { id: crypto.randomUUID(), role: "assistant", content: `I’ve processed ${file.name}.\n\n${detail}`, createdAt: new Date().toISOString(), kind: "evidence", metadata: { documentId: body.documentId } } } }));
          setEvidenceRequested(true); setNotice(`${file.name} processed.`);
        } catch (caught) { setNotice(caught instanceof Error ? caught.message : "Could not process document."); }
        finally { setProcessing(false); }
      }}/>
      <ConversationWorkspace
        workflow="REPORT"
        signedIn={signedIn}
        title="Complete GCI Report"
        subtitle={signedIn ? "Talk, upload evidence when GCI asks, and build one continuous credibility record." : "Start as a guest. Your account is required only when GCI asks for your first private document."}
        onAttach={evidenceRequested ? requestUpload : undefined}
        onMessagesChange={handleMessages}
        onReset={() => { setEvidenceRequested(false); setSnapshot(null); setNotice(null); }}
        bottomAction={evidenceRequested ? (
          <div className="rounded-2xl border border-hair bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF3F7] text-navy">{signedIn ? <FileUp size={14}/> : <LockKeyhole size={14}/>}</div>
              <div className="flex-1"><div className="text-xs font-semibold text-ink">GCI is ready for evidence</div><p className="mt-1 text-[11px] leading-5 text-mute">Attach the document GCI just requested. It will be analyzed against the conversation before GCI asks for the next useful item.</p>{notice && <p className="mt-2 text-[11px] font-medium text-teal">{notice}</p>}</div>
              <div className="flex flex-wrap gap-2"><button onClick={requestUpload} disabled={processing} className="rounded-full border border-hair px-3 py-2 text-xs font-semibold text-ink disabled:opacity-60">{processing ? "Processing…" : signedIn ? "Attach evidence" : "Sign in to upload"}</button>{signedIn && <button onClick={finalize} disabled={finalizing} className="rounded-full bg-navy px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{finalizing ? "Checking readiness…" : "I’m done — prepare my GCI package"}</button>}{snapshot && <a href={`/api/export/report-snapshot?id=${snapshot.snapshotId}`} className="rounded-full border border-teal px-3 py-2 text-xs font-semibold text-teal">Download 3-page GCI PDF</a>}</div>
            </div>
          </div>
        ) : null}
      />
    </>
  );
}
