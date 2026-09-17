"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, NotebookPen } from "lucide-react";
import { DirectDocumentUpload } from "@/components/documents/DirectDocumentUpload";

export type ApplyProgram = { id: string; title: string; level: string; intake: string | null };
export type ExistingApplication = { id: string; status: string; ownership: string } | null;

function programLabel(p: ApplyProgram) {
  return `${p.title} — ${p.level}${p.intake ? ` · ${p.intake}` : ""}`;
}

// The university-page equivalent of the dashboard's DirectApplicationBox: a
// student who lands directly on a university (not through Noodles) can start
// the exact same StudentApplication record here, with the university already
// fixed by page context. Same /api/applications endpoint, same architecture —
// only the entry point and copy are different, per request, so it doesn't
// read as a duplicate of the dashboard box.
export function UniversityApplyPanel({
  universityId,
  universityName,
  programs,
  signedIn,
  existingApplication,
}: {
  universityId: string;
  universityName: string;
  programs: ApplyProgram[];
  signedIn: boolean;
  existingApplication: ExistingApplication;
}) {
  const [programText, setProgramText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState<{ id: string; ownership: string } | null>(
    existingApplication ? { id: existingApplication.id, ownership: existingApplication.ownership } : null,
  );

  const programByLabel = useMemo(() => new Map(programs.map((p) => [programLabel(p), p])), [programs]);
  const selectedProgram = programByLabel.get(programText.trim()) || null;
  const hasPrograms = programs.length > 0;
  const intendedSubjectNote = !hasPrograms || !selectedProgram ? programText.trim().slice(0, 160) : "";

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          universityId,
          programId: selectedProgram?.id || undefined,
          intendedSubjectNote: intendedSubjectNote || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not open your application form.");
      const application = body.application;
      if (!application?.id) throw new Error("Application was created but its identifier was not returned.");
      setStarted({ id: application.id, ownership: application.ownership });
      if (application.ownership === "SOUP_MANAGED") {
        await fetch(`/api/applications/${encodeURIComponent(application.id)}/requirements`, { method: "POST" }).catch(() => undefined);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not open your application form.");
    } finally {
      setLoading(false);
    }
  }

  if (!signedIn) {
    return (
      <div className="rounded-2xl border border-hair bg-white p-5">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.14em] text-teal"><NotebookPen size={12}/>University Application Desk</div>
        <h2 className="mt-2 text-sm font-semibold text-ink">Apply to {universityName} without Noodles</h2>
        <p className="mt-1 text-xs leading-5 text-mute">Create your free SOUP account to open an application form for this university and attach your documents directly — no AI conversation required.</p>
        <Link href={`/sign-up?next=${encodeURIComponent(`/universities/${universityId}`)}`} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white">
          Create account to apply <ArrowRight size={13}/>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-hair bg-white p-5">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.14em] text-teal"><NotebookPen size={12}/>University Application Desk</div>
        <h2 className="mt-2 text-sm font-semibold text-ink">Apply to {universityName} without Noodles</h2>

        {started ? (
          <>
            <p className="mt-2 text-xs leading-5 text-mute">
              {started.ownership === "SOUP_MANAGED"
                ? "Your application is open. Attach your documents below — SOUP will manage this application from here."
                : "Your application is tracked here as self-managed — SOUP does not submit it, but documents and status still stay in My SOUP."}
            </p>
            <Link href={`/applications/${started.id}`} className="mt-3 inline-flex rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white">Open application</Link>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs leading-5 text-mute">Open your application form for {universityName} now and attach documents straight away — this creates the same application record Noodles would.</p>
            {hasPrograms && (
              <>
                <label className="mt-3 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Program (optional)</label>
                <input
                  list="university-apply-programs"
                  value={programText}
                  onChange={(event) => setProgramText(event.target.value)}
                  placeholder="Start typing a program..."
                  className="mt-1 w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs text-ink outline-none focus:border-navy/40"
                />
                <datalist id="university-apply-programs">
                  {programs.map((p) => <option key={p.id} value={programLabel(p)} />)}
                </datalist>
              </>
            )}
            <button onClick={start} disabled={loading} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">
              {loading && <Loader2 size={12} className="animate-spin" />}
              {loading ? "Opening…" : "Open my application form"}
            </button>
            {error && <p className="mt-2 text-[11px] leading-4 text-[#9D3127]">{error}</p>}
          </>
        )}
      </div>

      {started && <DirectDocumentUpload/>}
    </div>
  );
}
