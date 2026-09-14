"use client";

import { useState } from "react";
import { Check, Loader2, RotateCcw } from "lucide-react";

export function JourneyItemAction({ itemId, complete }: { itemId: string; complete: boolean }) {
  const [busy, setBusy] = useState(false);
  async function update() {
    setBusy(true);
    try {
      const response = await fetch("/api/journey/item-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, status: complete ? "ACTION_REQUIRED" : "COMPLETE" }),
      });
      if (!response.ok) return;
      window.location.reload();
    } finally { setBusy(false); }
  }
  return (
    <button onClick={update} disabled={busy} className="inline-flex items-center gap-1 rounded-full border border-hair px-3 py-1.5 text-[11px] font-semibold text-ink disabled:opacity-60">
      {busy ? <Loader2 size={11} className="animate-spin"/> : complete ? <RotateCcw size={11}/> : <Check size={11}/>} {complete ? "Reopen" : "Mark done"}
    </button>
  );
}
