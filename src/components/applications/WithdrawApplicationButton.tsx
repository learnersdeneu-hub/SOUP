"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function WithdrawApplicationButton({ applicationId }: { applicationId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function withdraw() {
    const reason = window.prompt("Why do you want to withdraw this application?");
    if (!reason?.trim()) return;
    if (!window.confirm("Withdraw this application? This will stop the current SOUP application workflow.")) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/applications/${encodeURIComponent(applicationId)}/withdraw`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not withdraw the application.");
      window.location.reload();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not withdraw the application."); }
    finally { setBusy(false); }
  }
  return <div><button onClick={withdraw} disabled={busy} className="rounded-xl border border-hair px-3 py-2 text-[11px] font-semibold text-mute disabled:opacity-60">{busy ? <span className="inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin"/>Withdrawing</span> : "Withdraw application"}</button>{error && <div className="mt-1 max-w-xs text-[10px] text-[#9D3127]">{error}</div>}</div>;
}
