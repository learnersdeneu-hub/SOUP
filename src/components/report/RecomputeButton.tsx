"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { recomputeMyScores } from "@/app/actions/scoring";

export function RecomputeButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(async () => { await recomputeMyScores(); })}
      disabled={pending}
      className="flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-2 border border-hair text-ink disabled:opacity-50"
    >
      <RefreshCw size={13} className={pending ? "animate-spin" : ""} />
      {pending ? "Recomputing..." : "Recompute Score"}
    </button>
  );
}
