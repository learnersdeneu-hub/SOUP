"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileUp, Loader2, NotebookPen, X } from "lucide-react";
import { updateCustomerProfile } from "@/app/actions/account";
import { uploadEvidenceFile, type EvidenceUploadResult } from "@/lib/documents/uploadEvidence";

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

const ACCEPTED_FILE_TYPES = ".pdf,.png,.jpg,.jpeg,.docx";

// The university-page equivalent of the dashboard's DirectApplicationBox: a
// student who lands directly on a university (not through Noodles) can start
// the exact same StudentApplication record here, with the university already
// fixed by page context.
//
// One form, one button: the applicant-information fields (including
// academic background, now asked as a few labeled details rather than one
// vague box) and the document attachment zone live in the same card, and
// "Submit application" is the only action — it saves the profile fields
// (updateCustomerProfile, same action /account uses), creates the
// application (same /api/applications POST Noodles or the dashboard's
// Direct Application box would use), then uploads every attached file
// (uploadEvidenceFile, same /api/evidence/process Noodles uses). Files
// picked before submitting are queued, not uploaded yet, so "Submit
// application" really does aggregate the whole thing into one action from
// the student's point of view — no separate documents step, no separate
// document button.
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
  const [highestQualification, setHighestQualification] = useState("");
  const [institution, setInstitution] = useState("");
  const [gradeResult, setGradeResult] = useState("");
  const [additionalAcademicDetails, setAdditionalAcademicDetails] = useState(prefill.academicBackgroundSummary);
  const [programText, setProgramText] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResults, setUploadResults] = useState<EvidenceUploadResult[]>([]);
  const [uploadingMore, setUploadingMore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [started, setStarted] = useState<{ id: string; ownership: string } | null>(
    existingApplication ? { id: existingApplication.id, ownership: existingApplication.ownership } : null,
  );

  const programByLabel = useMemo(() => new Map(programs.map((p) => [programLabel(p), p])), [programs]);
  const selectedProgram = programByLabel.get(programText.trim()) || null;
  const hasPrograms = programs.length > 0;
  const intendedSubjectNote = !hasPrograms || !selectedProgram ? programText.trim().slice(0, 160) : "";

  const combinedAcademicSummary = [
    highestQualification.trim() && institution.trim() ? `${highestQualification.trim()} at ${institution.trim()}` : highestQualification.trim() || institution.trim(),
    gradeResult.trim() ? `(${gradeResult.trim()})` : "",
    additionalAcademicDetails.trim(),
  ].filter(Boolean).join(" ").trim();

  const missing = [
    !fullName.trim() && "full legal name",
    !dateOfBirth && "date of birth",
    !nationality.trim() && "nationality",
    !currentCountry.trim() && "current country of residence",
    !combinedAcademicSummary && "academic background",
  ].filter((value): value is string => Boolean(value));

  function addPendingFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length) setPendingFiles((prev) => [...prev, ...files]);
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadMore(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setUploadingMore(true);
    const collected: EvidenceUploadResult[] = [];
    for (const file of files) {
      collected.push(await uploadEvidenceFile(file));
      setUploadResults((prev) => [...prev, collected[collected.length - 1]]);
    }
    setUploadingMore(false);
  }

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
      profileForm.set("academicBackgroundSummary", combinedAcademicSummary);
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

      if (pendingFiles.length) {
        const collected: EvidenceUploadResult[] = [];
        for (const file of pendingFiles) {
          collected.push(await uploadEvidenceFile(file));
          setUploadResults((prev) => [...prev, collected[collected.length - 1]]);
        }
        setPendingFiles([]);
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
    <div className="rounded-2xl border border-hair bg-white p-5">
      <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.14em] text-teal"><NotebookPen size={12}/>University Application Desk</div>
      <h2 className="mt-2 text-sm font-semibold text-ink">Apply to {universityName} without Noodles</h2>

      {started ? (
        <>
          <p className="mt-2 text-xs leading-5 text-mute">
            {started.ownership === "SOUP_MANAGED"
              ? "Your application is submitted. Attach any further documents below — SOUP will manage this application from here."
              : "Your application is tracked here as self-managed — SOUP does not submit it, but documents and status still stay in My SOUP."}
          </p>
          <Link href={`/applications/${started.id}`} className="mt-3 inline-flex rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white">Open application</Link>

          {uploadResults.length > 0 && (
            <ul className="mt-4 space-y-1.5 border-t border-hair pt-3">
              {uploadResults.map((item, index) => (
                <li key={`${item.name}-${index}`} className={`flex items-start gap-1.5 text-[11px] leading-4 ${item.status === "error" ? "text-[#9D3127]" : "text-teal"}`}>
                  {item.status === "done" && <CheckCircle2 size={12} className="mt-0.5 shrink-0" />}
                  <span><strong className="font-semibold">{item.name}</strong> — {item.detail}</span>
                </li>
              ))}
            </ul>
          )}
          <input ref={fileInputRef} type="file" accept={ACCEPTED_FILE_TYPES} multiple className="hidden" onChange={uploadMore} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingMore}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-hair px-4 py-2.5 text-xs font-semibold text-ink disabled:opacity-60"
          >
            {uploadingMore ? <Loader2 size={12} className="animate-spin" /> : <FileUp size={13} />}
            {uploadingMore ? "Reading document…" : "Attach another document"}
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-xs leading-5 text-mute">This is the same application form every university uses in SOUP. Fill it in, attach your documents, then submit once — this creates the same application record Noodles would.</p>

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

          <div className="mt-4 border-t border-hair pt-3">
            <span className="block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Academic background</span>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[10px] text-mute">Highest qualification / currently studying</span>
                <input value={highestQualification} onChange={(e) => setHighestQualification(e.target.value)} placeholder="e.g. A-Levels, BBA, High School Diploma" className="w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs text-ink outline-none focus:border-navy/40" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] text-mute">Institution</span>
                <input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="e.g. LUMS, Aitchison College" className="w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs text-ink outline-none focus:border-navy/40" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-[10px] text-mute">Grades / GPA / results</span>
                <input value={gradeResult} onChange={(e) => setGradeResult(e.target.value)} placeholder="e.g. 3.63 GPA, AAB predicted" className="w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs text-ink outline-none focus:border-navy/40" />
              </label>
            </div>
            <label className="mt-3 block">
              <span className="mb-1 block text-[10px] text-mute">Anything else relevant (subjects, prior degrees, gaps)</span>
              <textarea value={additionalAcademicDetails} onChange={(e) => setAdditionalAcademicDetails(e.target.value)} rows={2} placeholder="e.g. Also completed MSc Supply Chain (LUMS)" className="w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs leading-5 text-ink outline-none focus:border-navy/40" />
            </label>
          </div>

          {hasPrograms && (
            <div className="mt-4 border-t border-hair pt-3">
              <label className="block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Program (optional)</label>
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
            </div>
          )}

          <div className="mt-4 border-t border-hair pt-3">
            <span className="block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Documents</span>
            <p className="mt-1 text-[11px] leading-4 text-mute">Attach your passport, transcript, offer letter or other evidence now — they upload together with the rest of this form when you submit.</p>
            <input ref={fileInputRef} type="file" accept={ACCEPTED_FILE_TYPES} multiple className="hidden" onChange={addPendingFiles} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 inline-flex items-center gap-2 rounded-xl border border-hair px-3 py-2 text-xs font-semibold text-ink"
            ><FileUp size={13}/>Attach documents</button>
            {pendingFiles.length > 0 && (
              <ul className="mt-2 space-y-1">
                {pendingFiles.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 rounded-lg bg-paper px-3 py-1.5 text-[11px] text-ink">
                    <span className="truncate">{file.name}</span>
                    <button type="button" onClick={() => removePendingFile(index)} aria-label={`Remove ${file.name}`} className="shrink-0 text-mute hover:text-ink"><X size={12}/></button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button onClick={submit} disabled={loading} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">
            {loading && <Loader2 size={12} className="animate-spin" />}
            {loading ? "Submitting…" : "Submit application"}
          </button>
          {error && <p className="mt-2 text-[11px] leading-4 text-[#9D3127]">{error}</p>}
        </>
      )}
    </div>
  );
}
