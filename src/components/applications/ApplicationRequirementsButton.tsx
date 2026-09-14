"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export function ApplicationRequirementsButton({ applicationId, label = "Prepare document checklist", staff = false, refresh = false }: { applicationId: string; label?: string; staff?: boolean; refresh?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true); setError(null);
    try {
      const response = await fetch(staff ? `/api/admin/applications/${encodeURIComponent(applicationId)}/requirements` : `/api/applications/${encodeURIComponent(applicationId)}/requirements`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not prepare application requirements.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not prepare application requirements.");
    } finally { setLoading(false); }
  }

  return <div><button onClick={generate} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">{loading ? <Loader2 size={12} className="animate-spin"/> : <RefreshCw size={12}/>} {loading ? "Checking official requirements…" : label}</button>{error && <p className="mt-2 max-w-xl text-xs leading-5 text-[#9D3127]">{error}</p>}</div>;
}
