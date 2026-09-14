"use client";

import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function AutosaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry?: () => void }) {
  if (status === "idle") return <span className="text-[11px] text-mute">&nbsp;</span>;

  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-mute">
        <Loader2 size={11} className="animate-spin" /> Saving...
      </span>
    );
  }

  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-teal">
        <CheckCircle2 size={11} /> Saved
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[#B3261E]">
      <AlertCircle size={11} /> Error saving
      {onRetry && (
        <button onClick={onRetry} className="underline font-medium">
          Retry
        </button>
      )}
    </span>
  );
}
