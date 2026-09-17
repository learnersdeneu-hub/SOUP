"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, NotebookPen } from "lucide-react";
import { DirectDocumentUpload } from "@/components/documents/DirectDocumentUpload";
import { updateCustomerProfile } from "@/app/actions/account";

export type ApplyProgram = { id: string; title: string; level: string; intake: string | null };
export type ExistingApplication = { id: string; status: string; ownership: string } | null;
export type ApplicantPrefill = {
  fullName: string;
  dateOfBirth: string; // "" or "YYYY-MM-DD", for an <input type="date">
  nationality: string;
  currentCountry: string;
  academicBackgroundSummary: string;
};

function programLabel(p: ApplyProgram) {
  return `${p.title} — ${p.level}${p.intake ? ` · ${p.intake}` : ""}`;
}

// The university-page equivalent of the dashboard's DirectApplicationBox: a
// student who lands directly on a university (not through Noodles) can start
// the exact same StudentApplication record here, with the university already
// fixed by page context.
//
// This is a real form, not a one-click action: the same "core application
// information" every SOUP-managed application eventually needs (see
// missingCoreApplicationInformation) — full name, date of birth,
// nationality, current country, academic background — is collected here,
// upfront, using the same updateCustomerProfile action the /account page
// uses. Clicking "Submit" used to create an application with none of this
// captured, which then immediately showed as "3 missing" on the application
// page; asking for it here, once, up front, is the actual fix, not just a
// relabeled button.
export function UniversityApplyPanel({
  universityId,
  universityName,
  programs,
  signedIn,
  existingApplication,
  prefill,
}: {
  universityId: string;
  universityName: string;
  programs: ApplyProgram[];
  signedIn: boolean;
  existingApplication: ExistingApplication;
  prefill: ApplicantPrefill;
}) {
  const [fullName, setFullName] = useState(prefill.fullName);
  const [dateOfBirth, setDateOfBirth] = useState(prefill.dateOfBirth);
  const [nationality, setNationality] = useState(prefill.nationality);
  const [currentCountry, setCurrentCountry] = useState(prefill.currentCountry);
  const [academicBackgroundSummary, setAcademicBackgroundSummary] = useState(prefill.academicBackgroundSummary);
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

  const missing = [
    !fullName.trim() && "full legal name",
    !dateOfBirth && "date of birth",
    !nationality.trim() && "nationality",
    !currentCountry.trim() && "current country of residence",
    !academicBackgroundSummary.trim() && "academic background",
  ].filter((value): value is string => Boolean(value));

  async function submit() {
    if (missing.length) { setError(`Please fill in: ${missing.join(", ")}.`); return; }
    setLoading(true);
    setError(null);
    try {
      const profileForm = new FormData();
      profileForm.set("fullName", fullName);
      profileForm.set("dateOfBirth", dateOfBirth);
      profileForm.set("nationality", nationality);
      profileForm.set("currentCountry", currentCountry);
      profileForm.set("academicBackgroundSummary", academicBackgroundSummary);
      await updateCustomerProfile(profileForm);

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
      if (!response.ok) throw new Error(body.error || "Could not submit your application.");
      const application = body.application;
      if (!application?.id) throw new Error("Application was created but its identifier was not returned.");
      setStarted({ id: application.id, ownership: application.ownership });
      if (application.ownership === "SOUP_MANAGED") {
        await fetch(`/api/applications/${encodeURIComponent(application.id)}/requirements`, { method: "POST" }).catch(() => undefined);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not submit your application.");
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
                ? "Your application is submitted. Attach your documents below — SOUP will manage this application from here."
                : "Your application is tracked here as self-managed — SOUP does not submit it, but documents and status still stay in My SOUP."}
            </p>
            <Link href={`/applications/${started.id}`} className="mt-3 inline-flex rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white">Open application</Link>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs leading-5 text-mute">This is the same application form every university uses in SOUP. Fill it in once, then attach your documents below — this creates the same application record Noodles would.</p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Full legal name</span>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs text-ink outline-none focus:border-navy/40" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Date of birth</span>
                <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs text-ink outline-none focus:border-navy/40" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Nationality</span>
                <input value={nationality} onChange={(e) => setNationality(e.target.value)} className="w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs text-ink outline-none focus:border-navy/40" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Current country of residence</span>
                <input value={currentCountry} onChange={(e) => setCurrentCountry(e.target.value)} className="w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs text-ink outline-none focus:border-navy/40" />
              </label>
            </div>
            <label className="mt-3 block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Academic background</span>
              <textarea value={academicBackgroundSummary} onChange={(e) => setAcademicBackgroundSummary(e.target.value)} rows={2} placeholder="e.g. A-Levels in Maths, Physics, Chemistry — predicted AAB" className="w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs leading-5 text-ink outline-none focus:border-navy/40" />
            </label>

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

            <button onClick={submit} disabled={loading} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">
              {loading && <Loader2 size={12} className="animate-spin" />}
              {loading ? "Submitting…" : "Submit application"}
            </button>
            {error && <p className="mt-2 text-[11px] leading-4 text-[#9D3127]">{error}</p>}
          </>
        )}
      </div>

      <DirectDocumentUpload/>
    </div>
  );
}
