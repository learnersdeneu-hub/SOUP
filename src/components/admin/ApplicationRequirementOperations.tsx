"use client";

import { useState } from "react";
import { Check, Loader2, RotateCcw, XCircle } from "lucide-react";

export function ApplicationRequirementOperations({ applicationId, itemId, status, hasDocument, requiresDocument }: { applicationId: string; itemId: string; status: string; hasDocument: boolean; requiresDocument: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function update(next: string) {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/admin/applications/${encodeURIComponent(applicationId)}/requirements/${encodeURIComponent(itemId)}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not update requirement.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update requirement.");
    } finally { setBusy(false); }
  }

  return <div className="space-y-2">
    <div className="flex flex-wrap gap-1.5">
      <button onClick={() => update("COMPLETE")} disabled={busy || (requiresDocument && !hasDocument)} className="inline-flex items-center gap-1 rounded-lg bg-navy px-2.5 py-2 text-[10px] font-semibold text-white disabled:opacity-40"><Check size={10}/>Accept for file</button>
      <button onClick={() => update(requiresDocument ? "WAITING_FOR_DOCUMENT" : "ACTION_REQUIRED")} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-hair px-2.5 py-2 text-[10px] font-semibold text-ink disabled:opacity-40"><RotateCcw size={10}/>Re-open</button>
      <button onClick={() => update("NOT_APPLICABLE")} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-hair px-2.5 py-2 text-[10px] font-semibold text-mute disabled:opacity-40"><XCircle size={10}/>N/A</button>
      {busy && <Loader2 size={12} className="animate-spin text-mute"/>}
    </div>
    {message && <div className="text-[10px] text-red-700">{message}</div>}
    {status === "COMPLETE" && <div className="text-[10px] font-semibold text-teal">Accepted into SOUP application file</div>}
  </div>;
}
