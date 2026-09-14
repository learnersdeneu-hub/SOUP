"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

export function StudentApprovalButton({ applicationId }: { applicationId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function approve() {
    if (!window.confirm("I confirm the information and documents in this application are accurate to the best of my knowledge, and I approve this file for final SOUP submission checks.")) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/applications/${encodeURIComponent(applicationId)}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ declarationAccepted: true }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not approve the application file.");
      window.location.reload();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not approve the application file."); }
    finally { setBusy(false); }
  }
  return <div><button onClick={approve} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">{busy ? <Loader2 size={13} className="animate-spin"/> : <CheckCircle2 size={13}/>}Approve for submission</button>{error && <div className="mt-2 max-w-xs text-[10px] leading-4 text-[#9D3127]">{error}</div>}</div>;
}
