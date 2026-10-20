"use client";

import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { submitRecommendationLetterText } from "@/app/actions/recommenderSubmission";

const MAX_BYTES = 10 * 1024 * 1024;

// The only place in the app where a file upload doesn't go through
// UploadBox/category-upload — the recommender has no SOUP session, so this
// posts straight to the token-authenticated /api/recommend/[token]/upload
// route instead. Either mode (type or upload) is accepted per product
// decision — see the plan's "Recommender letter submission" judgment call.
export function RecommenderLetterForm({ token, studentName }: { token: string; studentName: string }) {
  const [mode, setMode] = useState<"TEXT" | "FILE">("TEXT");
  const [letterText, setLetterText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submitText() {
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("token", token);
      form.set("letterText", letterText);
      const result = await submitRecommendationLetterText(form);
      if (!result.ok) { setError(result.error); return; }
      setDone(true);
    } catch {
      setError("Could not submit your letter. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitFile() {
    if (!file) { setError("Choose a file first."); return; }
    if (file.size > MAX_BYTES) { setError("Files must be 10 MB or smaller."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch(`/api/recommend/${token}/upload`, { method: "POST", body: form });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { setError(body.error || "Could not upload your file."); return; }
      setDone(true);
    } catch {
      setError("Could not upload your file. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mt-6 rounded-2xl border border-hair bg-white p-6">
        <div className="text-sm font-semibold text-teal">Thank you — your letter has been submitted.</div>
        <p className="mt-2 text-sm leading-6 text-mute">{studentName} has been notified. You can close this page.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-hair bg-white p-6">
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode("TEXT")} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${mode === "TEXT" ? "border-navy bg-navy text-white" : "border-hair text-ink"}`}>Type my letter</button>
        <button type="button" onClick={() => setMode("FILE")} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${mode === "FILE" ? "border-navy bg-navy text-white" : "border-hair text-ink"}`}>Upload a file</button>
      </div>

      {mode === "TEXT" ? (
        <div className="mt-4">
          <textarea value={letterText} onChange={(e) => setLetterText(e.target.value)} rows={14} placeholder="Write your recommendation letter here…" className="w-full rounded-xl border border-hair bg-white p-3 text-sm leading-6 text-ink outline-none focus:border-navy/40"/>
          <div className="mt-1 text-[11px] text-mute">{letterText.trim() ? letterText.trim().split(/\s+/).length : 0} words</div>
        </div>
      ) : (
        <div className="mt-4">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-hair bg-paper px-4 py-8 text-center">
            <Upload size={20} className="text-mute"/>
            <span className="text-xs font-medium text-ink">{file ? file.name : "Click to choose a PDF or DOCX"}</span>
            <input type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)}/>
          </label>
        </div>
      )}

      {error && <div className="mt-3 text-xs font-medium text-[#9D3127]">{error}</div>}

      <button
        type="button"
        onClick={mode === "TEXT" ? submitText : submitFile}
        disabled={submitting || (mode === "TEXT" ? !letterText.trim() : !file)}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        {submitting && <Loader2 size={12} className="animate-spin"/>}
        {submitting ? "Submitting…" : "Submit letter"}
      </button>
    </div>
  );
}
