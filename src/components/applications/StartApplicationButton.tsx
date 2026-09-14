"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export function StartApplicationButton({ shortlistItemId, universityId, programId }: { shortlistItemId: string; universityId: string; programId?: string | null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function start() {
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shortlistItemId, universityId, programId }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not start the application.");
      const applicationId = body.application?.id;
      if (!applicationId) throw new Error("Application was created but its identifier was not returned.");
      await fetch(`/api/applications/${encodeURIComponent(applicationId)}/requirements`, { method: "POST" }).catch(() => undefined);
      window.location.href = `/applications/${encodeURIComponent(applicationId)}`;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not start the application."); }
    finally { setLoading(false); }
  }
  return <div className="text-right"><button onClick={start} disabled={loading} className="inline-flex items-center gap-1 rounded-xl bg-navy px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{loading && <Loader2 size={11} className="animate-spin"/>}{loading ? "Starting…" : "Apply through SOUP"}</button>{error && <div className="mt-1 max-w-56 text-[10px] leading-4 text-[#9D3127]">{error}</div>}</div>;
}
