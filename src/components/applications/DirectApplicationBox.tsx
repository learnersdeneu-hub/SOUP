"use client";

import { useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";

export type DirectApplyProgram = { id: string; title: string; level: string; intake: string | null };
export type DirectApplyUniversity = { id: string; name: string; country: string; city: string | null; isPartner: boolean; programs: DirectApplyProgram[] };

// A student-facing fallback that works even when Noodles/Gemini is unavailable.
// It calls the same /api/applications endpoint Noodles uses, so a Direct
// Application and an AI-started one produce the identical StudentApplication
// record — there is no separate "manual" application architecture.
export function DirectApplicationBox({ universities }: { universities: DirectApplyUniversity[] }) {
  const [query, setQuery] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [programId, setProgramId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState<{ id: string; ownership: string } | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? universities.filter((u) => u.name.toLowerCase().includes(needle) || u.country.toLowerCase().includes(needle) || (u.city || "").toLowerCase().includes(needle))
      : universities;
    return matches.slice(0, 60);
  }, [universities, query]);

  const selectedUniversity = universities.find((u) => u.id === universityId) || null;

  async function start() {
    if (!universityId) { setError("Choose a university first."); return; }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universityId, programId: programId || undefined }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not start the application.");
      const application = body.application;
      if (!application?.id) throw new Error("Application was created but its identifier was not returned.");
      setStarted({ id: application.id, ownership: application.ownership });
      // Best-effort: SOUP-managed applications get an AI-researched requirements
      // checklist when available. If AI/Gemini is down this silently no-ops —
      // the application itself is already safely created either way.
      if (application.ownership === "SOUP_MANAGED") {
        await fetch(`/api/applications/${encodeURIComponent(application.id)}/requirements`, { method: "POST" }).catch(() => undefined);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start the application.");
    } finally {
      setLoading(false);
    }
  }

  if (started) {
    return (
      <div className="rounded-2xl border border-hair bg-white p-5">
        <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Direct Application</div>
        <h2 className="mt-2 text-sm font-semibold text-ink">Application started</h2>
        <p className="mt-2 text-xs leading-5 text-mute">{started.ownership === "SOUP_MANAGED" ? "SOUP will manage this application. Upload your documents when ready." : "This is tracked as a self-managed application — SOUP does not submit it, but documents and status still stay in My SOUP."}</p>
        <a href={`/applications/${started.id}`} className="mt-3 inline-flex rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white">Open application</a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-hair bg-white p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Direct Application</div>
      <h2 className="mt-2 text-sm font-semibold text-ink">Start an application without Noodles</h2>
      <p className="mt-1 text-xs leading-5 text-mute">Search a university, pick a program if you know it, and start tracking your application here. This works even if AI guidance is unavailable, and creates the same application record Noodles would.</p>

      <div className="relative mt-3">
        <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setUniversityId(""); setProgramId(""); }}
          placeholder="Search university, city or country..."
          className="w-full rounded-full border border-hair bg-white py-2 pl-8 pr-3 text-xs text-ink outline-none focus:border-navy/40"
        />
      </div>

      <select
        value={universityId}
        onChange={(event) => { setUniversityId(event.target.value); setProgramId(""); setError(null); }}
        className="mt-2 w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs text-ink outline-none focus:border-navy/40"
        aria-label="Choose a university"
      >
        <option value="">{filtered.length ? "Choose a university" : "No matches — refine your search"}</option>
        {filtered.map((u) => <option key={u.id} value={u.id}>{u.name} · {[u.city, u.country].filter(Boolean).join(", ")}{u.isPartner ? "" : " (external)"}</option>)}
      </select>

      {selectedUniversity && selectedUniversity.programs.length > 0 && (
        <select
          value={programId}
          onChange={(event) => setProgramId(event.target.value)}
          className="mt-2 w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs text-ink outline-none focus:border-navy/40"
          aria-label="Choose a program"
        >
          <option value="">Program not decided yet</option>
          {selectedUniversity.programs.map((p) => <option key={p.id} value={p.id}>{p.title} · {p.level}{p.intake ? ` · ${p.intake}` : ""}</option>)}
        </select>
      )}

      {selectedUniversity && !selectedUniversity.isPartner && (
        <p className="mt-2 text-[10px] leading-4 text-mute">This university is not currently a SOUP partner. SOUP will track it as a self-managed application; you submit it directly with the university.</p>
      )}

      <button onClick={start} disabled={loading || !universityId} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">
        {loading && <Loader2 size={12} className="animate-spin" />}
        {loading ? "Starting…" : "Start application"}
      </button>
      {error && <p className="mt-2 text-[11px] leading-4 text-[#9D3127]">{error}</p>}
    </div>
  );
}
