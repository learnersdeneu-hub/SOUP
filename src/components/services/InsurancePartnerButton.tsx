"use client";

import { useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";

export function InsurancePartnerButton({ fallbackUrl, source = "INSURANCE_PAGE" }: { fallbackUrl: string; source?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/services/insurance/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not open the insurance marketplace.");
      window.location.href = body.url || fallbackUrl;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not open the insurance marketplace.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={start} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">
        {busy ? <Loader2 size={12} className="animate-spin"/> : <ArrowUpRight size={12}/>} Continue to insuremart
      </button>
      {error && <p className="mt-2 text-xs text-mute">{error}</p>}
    </div>
  );
}
