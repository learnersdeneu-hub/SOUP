"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";

const STATUSES = ["DOCUMENTS_REQUIRED", "READY_TO_SUBMIT", "SUBMITTED", "UNDER_REVIEW", "OFFER_RECEIVED", "CONDITIONAL_OFFER", "REJECTED", "WITHDRAWN", "ENROLLED"];
const OFFER_STATUSES = new Set(["OFFER_RECEIVED", "CONDITIONAL_OFFER"]);

export function ApplicationOperations({ applicationId, status, managed }: { applicationId: string; status: string; managed: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [conditionalOffer, setConditionalOffer] = useState(status === "CONDITIONAL_OFFER");
  if (!managed) return <div className="text-[11px] text-mute">External/student-managed — advisory only.</div>;

  async function updateStatus(next: string) {
    setBusy(true); setMessage(null);
    try {
      const payload: Record<string, string> = { status: next };
      if (next === "SUBMITTED") {
        const externalReference = window.prompt("University/application reference number");
        if (!externalReference) { setBusy(false); return; }
        const submissionEvidenceNote = window.prompt("Submission evidence note (for example confirmation email received at 18:42, portal confirmation ID, or where the evidence is stored)");
        if (!submissionEvidenceNote) { setBusy(false); return; }
        payload.externalReference = externalReference;
        payload.submissionEvidenceNote = submissionEvidenceNote;
      }
      if (next === "WITHDRAWN") {
        const notes = window.prompt("Reason for withdrawal");
        if (!notes) { setBusy(false); return; }
        payload.notes = notes;
      }
      const response = await fetch(`/api/admin/applications/${applicationId}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not update application.");
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update application."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">
      <select disabled={busy} value={status} onChange={(event) => updateStatus(event.target.value)} className="rounded-lg border border-hair bg-white px-2.5 py-2 text-[11px] font-semibold text-ink">
        {STATUSES.map((value) => <option key={value} value={value} disabled={OFFER_STATUSES.has(value)}>{value.replaceAll("_", " ")}{OFFER_STATUSES.has(value) ? " — use offer upload" : ""}</option>)}
      </select>
      <button onClick={() => fileRef.current?.click()} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-hair px-3 py-2 text-[11px] font-semibold text-ink"><Upload size={11}/> Upload offer</button>
      {busy && <Loader2 size={13} className="animate-spin text-mute"/>}
    </div>
    <label className="flex items-center gap-2 text-[11px] text-mute"><input type="checkbox" checked={conditionalOffer} onChange={(event) => setConditionalOffer(event.target.checked)} disabled={busy}/>The offer is conditional</label>
    <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={async (event) => {
      const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
      setBusy(true); setMessage(null);
      try {
        const form = new FormData(); form.append("file", file); form.append("conditional", String(conditionalOffer));
        const response = await fetch(`/api/admin/applications/${applicationId}/offer`, { method: "POST", body: form });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not upload offer letter.");
        window.location.reload();
      } catch (error) { setMessage(error instanceof Error ? error.message : "Could not upload offer letter."); }
      finally { setBusy(false); }
    }}/>
    {message && <div className="text-[11px] text-red-700">{message}</div>}
  </div>;
}
