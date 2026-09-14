"use client";

import { useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";

export function PartnerDirectoryButton({ partnerId, label, source = "SERVICE_DIRECTORY" }: { partnerId: string; label: string; source?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/services/referral/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, source }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not open this partner route.");
      window.location.href = body.url;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not open this partner route.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={start} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-navy px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
        {busy ? <Loader2 size={11} className="animate-spin"/> : <ArrowUpRight size={11}/>} {label}
      </button>
      {error && <div className="mt-1 max-w-xs text-[10px] text-mute">{error}</div>}
    </div>
  );
}
