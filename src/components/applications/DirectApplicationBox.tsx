"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

export type DirectApplyProgram = { id: string; title: string; level: string; intake: string | null };
export type DirectApplyUniversity = { id: string; name: string; country: string; city: string | null; isPartner: boolean; programs: DirectApplyProgram[] };

// Common degree subjects most students search for, offered as typeable
// suggestions only when the selected university has no verified program rows
// on file. This is never sent as a programId or stored as if it were a real,
// university-confirmed program — see the "intendedSubjectNote" handling below
// and in POST /api/applications, which records it as a plain, clearly
// unverified statement of the student's own interest.
const COMMON_SUBJECTS = [
  "Computer Science", "Business Administration", "Mechanical Engineering", "Electrical Engineering",
  "Civil Engineering", "Software Engineering", "Data Science", "Economics", "Finance", "Marketing",
  "Psychology", "Law", "Medicine", "Nursing", "Architecture", "International Relations",
  "Artificial Intelligence", "Biotechnology",
];

function universityLabel(u: DirectApplyUniversity) {
  return `${u.name} — ${[u.city, u.country].filter(Boolean).join(", ")}`;
}
function programLabel(p: DirectApplyProgram) {
  return `${p.title} — ${p.level}${p.intake ? ` · ${p.intake}` : ""}`;
}

// A student-facing fallback that works even when Noodles/Gemini is unavailable.
// It calls the same /api/applications endpoint Noodles uses, so a Direct
// Application and an AI-started one produce the identical StudentApplication
// record — there is no separate "manual" application architecture.
//
// The university list is fetched client-side from a cached API route
// (/api/universities/lite) rather than passed in as a server-rendered prop:
// this was previously a full-catalog Prisma query (300+ rows, each with a
// nested partner + programs include) run on every dashboard page load for a
// feature most visits never touch, measurably slowing dashboard TTFB. Now it
// loads lazily after the page has already rendered, and repeat loads mostly
// hit the API route's shared cache instead of the database at all.
export function DirectApplicationBox() {
  const [universities, setUniversities] = useState<DirectApplyUniversity[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [universityText, setUniversityText] = useState("");
  const [programText, setProgramText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState<{ id: string; ownership: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/universities/lite")
      .then((response) => (response.ok ? response.json() : { universities: [] }))
      .then((body) => { if (!cancelled) setUniversities(body.universities || []); })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setCatalogLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Always the full catalogue, alphabetical — no artificial cap, so a student
  // can type-to-find any university, not just the first page of results.
  const sortedUniversities = useMemo(() => [...universities].sort((a, b) => a.name.localeCompare(b.name)), [universities]);
  const universityByLabel = useMemo(() => new Map(sortedUniversities.map((u) => [universityLabel(u), u])), [sortedUniversities]);
  const selectedUniversity = universityByLabel.get(universityText.trim()) || null;

  const programByLabel = useMemo(() => new Map((selectedUniversity?.programs || []).map((p) => [programLabel(p), p])), [selectedUniversity]);
  const selectedProgram = programByLabel.get(programText.trim()) || null;
  const hasVerifiedPrograms = Boolean(selectedUniversity && selectedUniversity.programs.length > 0);
  // Only meaningful once a real university is chosen and there is no verified
  // program to match against — otherwise this is never sent to the server.
  const intendedSubjectNote = selectedUniversity && !hasVerifiedPrograms ? programText.trim().slice(0, 160) : "";

  async function start() {
    if (!selectedUniversity) { setError("Choose a university from the list first."); return; }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          universityId: selectedUniversity.id,
          programId: selectedProgram?.id || undefined,
          intendedSubjectNote: intendedSubjectNote || undefined,
        }),
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
      <p className="mt-1 text-xs leading-5 text-mute">Type a university and, if known, a program — this works even if AI guidance is unavailable, and creates the same application record Noodles would.</p>

      <label className="mt-3 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">{catalogLoading ? "University (loading catalogue…)" : `University (${sortedUniversities.length} in the SOUP catalogue)`}</label>
      <input
        list="direct-apply-universities"
        value={universityText}
        onChange={(event) => { setUniversityText(event.target.value); setProgramText(""); setError(null); }}
        placeholder={catalogLoading ? "Loading universities…" : "Start typing a university, city or country..."}
        disabled={catalogLoading}
        className="mt-1 w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs text-ink outline-none focus:border-navy/40 disabled:bg-paper disabled:text-mute"
      />
      <datalist id="direct-apply-universities">
        {sortedUniversities.map((u) => <option key={u.id} value={universityLabel(u)} />)}
      </datalist>

      {selectedUniversity && (
        <>
          <label className="mt-3 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">{hasVerifiedPrograms ? "Program" : "Intended subject (not yet on file for this university)"}</label>
          <input
            list="direct-apply-programs"
            value={programText}
            onChange={(event) => setProgramText(event.target.value)}
            placeholder={hasVerifiedPrograms ? "Start typing a program..." : "e.g. Computer Science, Business..."}
            className="mt-1 w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs text-ink outline-none focus:border-navy/40"
          />
          <datalist id="direct-apply-programs">
            {hasVerifiedPrograms
              ? selectedUniversity.programs.map((p) => <option key={p.id} value={programLabel(p)} />)
              : COMMON_SUBJECTS.map((subject) => <option key={subject} value={subject} />)}
          </datalist>
          {!hasVerifiedPrograms && <p className="mt-1 text-[10px] leading-4 text-mute">SOUP has no verified program list for this university yet, so this is recorded as your own stated interest, not a confirmed program.</p>}
        </>
      )}

      {selectedUniversity && !selectedUniversity.isPartner && (
        <p className="mt-2 text-[10px] leading-4 text-mute">This university is not currently a SOUP partner. SOUP will track it as a self-managed application; you submit it directly with the university.</p>
      )}

      <button onClick={start} disabled={loading || !selectedUniversity} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">
        {loading && <Loader2 size={12} className="animate-spin" />}
        {loading ? "Starting…" : "Start application"}
      </button>
      {error && <p className="mt-2 text-[11px] leading-4 text-[#9D3127]">{error}</p>}
    </div>
  );
}
