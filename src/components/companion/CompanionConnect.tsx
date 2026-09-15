"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2, RefreshCcw } from "lucide-react";

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function CompanionConnect() {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/companion/pairing-code", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not generate a pairing code.");
      setCode(body.code);
      setExpiresAt(new Date(body.expiresAt).getTime());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not generate a pairing code.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setRemainingMs(expiresAt - Date.now());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const expired = expiresAt !== null && remainingMs <= 0;

  return (
    <div className="rounded-2xl border border-hair bg-white p-6">
      {!code ? (
        <>
          <p className="text-xs leading-5 text-mute">Codes are valid for 10 minutes and can only be used once.</p>
          <button onClick={generate} disabled={loading} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">
            {loading && <Loader2 size={12} className="animate-spin" />}
            {loading ? "Generating…" : "Generate pairing code"}
          </button>
        </>
      ) : (
        <>
          <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-mute">{expired ? "Code expired" : "Enter this in the Companion side panel"}</div>
          <div className="mt-3 flex items-center gap-3">
            <div className={`select-all rounded-xl border px-5 py-4 font-mono text-2xl font-semibold tracking-[.3em] ${expired ? "border-hair bg-paper text-mute" : "border-navy/30 bg-[#F0F4F8] text-navy"}`}>{code}</div>
            {!expired && (
              <button onClick={() => navigator.clipboard?.writeText(code).catch(() => undefined)} aria-label="Copy code" title="Copy code" className="flex h-10 w-10 items-center justify-center rounded-xl border border-hair text-mute hover:border-navy hover:text-navy">
                <Copy size={14} />
              </button>
            )}
          </div>
          {!expired ? (
            <p className="mt-2 text-[11px] text-mute">Expires in {formatRemaining(remainingMs)}</p>
          ) : (
            <p className="mt-2 text-[11px] text-mute">Generate a new code to continue.</p>
          )}
          <button onClick={generate} disabled={loading} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-hair px-4 py-2.5 text-xs font-semibold text-ink hover:border-navy disabled:opacity-60">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
            {loading ? "Generating…" : "Generate a new code"}
          </button>
        </>
      )}
      {error && <p className="mt-3 text-[11px] leading-4 text-[#9D3127]">{error}</p>}
    </div>
  );
}
