"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, Download, Check, AlertTriangle, RotateCcw, FileText, Sparkles } from "lucide-react";
import type { PdfFieldInfo } from "@/lib/companion/pdfFill";
import type { DocumentMatchResult } from "@/lib/companion/documentMatch";
import type { DocumentCategory } from "@/lib/documents/categories";
import type { ApplicationReview } from "@/lib/companion/review";

type AttachableEntry = { category: DocumentCategory; label: string; match: DocumentMatchResult };
type FieldRow = PdfFieldInfo & { value: string; hadMatch: boolean };
type Screen = "idle" | "loading" | "review" | "error";
type ReviewScreen = "idle" | "thinking" | "done" | "error";

const REVIEW_STAGES = [
  "Reading the fields you confirmed…",
  "Checking which documents are attached…",
  "Asking SOUP's reviewer for an assessment…",
];

export function PdfFormFiller() {
  const [screen, setScreen] = useState<Screen>("idle");
  const [error, setError] = useState("");
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [attachable, setAttachable] = useState<AttachableEntry[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<Record<string, string>>({});
  const [downloading, setDownloading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [reviewScreen, setReviewScreen] = useState<ReviewScreen>("idle");
  const [reviewLines, setReviewLines] = useState<string[]>([]);
  const [review, setReview] = useState<ApplicationReview | null>(null);
  const [reviewError, setReviewError] = useState("");

  async function onFileChosen(file: File) {
    setFileObj(file);
    setScreen("loading");
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/companion/pdf/inspect", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong reading that PDF.");
        setScreen("error");
        return;
      }
      const incoming: PdfFieldInfo[] = (data.fields || []).filter((f: PdfFieldInfo) => f.kind !== "unsupported");
      setFields(incoming.map((f) => ({ ...f, value: f.matchedValue || "", hadMatch: Boolean(f.matchedValue) })));
      const attachableEntries: AttachableEntry[] = data.attachable || [];
      setAttachable(attachableEntries);
      const initialSelected: Record<string, string> = {};
      for (const entry of attachableEntries) {
        if (entry.match.outcome === "SINGLE_MATCH") initialSelected[entry.category] = entry.match.document.id;
      }
      setSelectedDocs(initialSelected);
      setReviewScreen("idle");
      setReview(null);
      setScreen("review");
    } catch {
      setError("Couldn't reach SOUP right now. Check your connection and try again.");
      setScreen("error");
    }
  }

  // SOUP reviews the application automatically the moment it has finished
  // detecting fields and documents — not behind an extra click — the same
  // "it just works, and tells you what it thinks" posture as the rest of
  // Companion.
  useEffect(() => {
    if (screen === "review" && reviewScreen === "idle" && fields.length > 0) {
      runReview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  function updateField(name: string, value: string) {
    setFields((prev) => prev.map((f) => (f.name === name ? { ...f, value } : f)));
  }

  async function runReview() {
    setReviewScreen("thinking");
    setReviewError("");
    setReviewLines([]);

    let cancelled = false;
    (async () => {
      for (const stage of REVIEW_STAGES) {
        await new Promise((resolve) => setTimeout(resolve, 550));
        if (cancelled) return;
        setReviewLines((prev) => [...prev, stage]);
      }
    })();

    try {
      const fieldsPayload = fields.map((f) => ({ label: f.label, value: f.value, filled: Boolean(f.value), source: f.hadMatch ? f.matchedSource : null }));
      const documentsPayload = attachable.map((entry) => {
        const docId = selectedDocs[entry.category];
        const doc = entry.match.outcome === "SINGLE_MATCH"
          ? entry.match.document
          : entry.match.outcome === "AMBIGUOUS" ? entry.match.documents.find((d) => d.id === docId) : undefined;
        return { label: entry.label, attached: Boolean(docId), fileName: doc?.originalFileName || null };
      });
      const res = await fetch("/api/companion/pdf/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: fieldsPayload, documents: documentsPayload, context: fileObj?.name || null }),
      });
      const data = await res.json();
      cancelled = true;
      if (!res.ok) {
        setReviewError(data.error || "Could not generate a review right now.");
        setReviewScreen("error");
        return;
      }
      setReview(data.review);
      setReviewScreen("done");
    } catch {
      cancelled = true;
      setReviewError("Could not reach SOUP right now.");
      setReviewScreen("error");
    }
  }

  async function downloadFilled() {
    if (!fileObj) return;
    setDownloading(true);
    try {
      const values: Record<string, string> = {};
      for (const field of fields) if (field.value) values[field.name] = field.value;
      const attachDocumentIds = Object.values(selectedDocs).filter(Boolean);

      const body = new FormData();
      body.append("file", fileObj);
      body.append("values", JSON.stringify(values));
      body.append("attachDocumentIds", JSON.stringify(attachDocumentIds));

      const res = await fetch("/api/companion/pdf/fill", { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Couldn't fill that PDF.");
        setScreen("error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "soup-application-filled.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  function reset() {
    setScreen("idle");
    setFileObj(null);
    setFields([]);
    setAttachable([]);
    setSelectedDocs({});
    setError("");
    setReviewScreen("idle");
    setReview(null);
    setReviewError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  const matched = fields.filter((f) => f.hadMatch);
  const needsInput = fields.filter((f) => !f.hadMatch);

  return (
    <div className="rounded-[28px] border border-hair bg-white p-7 sm:p-9">
      {screen === "idle" && (
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-hair bg-paper px-6 py-14 text-center hover:border-navy/40">
          <Upload size={28} className="text-navy" />
          <div className="text-sm font-semibold text-ink">Choose a PDF application form</div>
          <p className="max-w-sm text-xs leading-5 text-mute">Any fillable PDF — a visa form, a university's own application PDF, anything with real form fields. SOUP reads it, fills what it can from your profile, reviews the whole thing, and lets you fix the rest before you download it.</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFileChosen(file);
            }}
          />
        </label>
      )}

      {screen === "loading" && (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-hair border-t-navy" />
          <div className="text-sm font-semibold text-ink">Reading {fileObj?.name}…</div>
          <p className="text-xs text-mute">Matching its fields against your SOUP profile.</p>
        </div>
      )}

      {screen === "error" && (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <AlertTriangle size={26} className="text-amber-600" />
          <div className="max-w-sm text-sm font-semibold text-ink">{error}</div>
          <button onClick={reset} className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-hair bg-white px-4 py-2.5 text-xs font-semibold text-ink">
            <RotateCcw size={13} /> Try another file
          </button>
        </div>
      )}

      {screen === "review" && (
        <div className="flex flex-col gap-7">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText size={18} className="shrink-0 text-navy" />
              <div className="truncate text-sm font-semibold text-ink">{fileObj?.name}</div>
            </div>
            <button onClick={reset} className="shrink-0 text-xs font-semibold text-mute hover:text-ink">Choose a different file</button>
          </div>

          {matched.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[.08em] text-teal">
                <Check size={12} /> Filled automatically ({matched.length})
              </div>
              <div className="flex flex-col gap-2">
                {matched.map((field) => <FieldInput key={field.name} field={field} onChange={updateField} />)}
              </div>
            </div>
          )}

          {needsInput.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[.08em] text-amber-600">
                <AlertTriangle size={12} /> Needs your input ({needsInput.length})
              </div>
              <div className="flex flex-col gap-2">
                {needsInput.map((field) => <FieldInput key={field.name} field={field} onChange={updateField} />)}
              </div>
            </div>
          )}

          {attachable.length > 0 && (
            <div>
              <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[.08em] text-teal">Attach your documents</div>
              <p className="mb-2 text-[11px] leading-5 text-mute">Appended as extra pages at the end of the download — one complete file to submit.</p>
              <div className="flex flex-col gap-1.5">
                {attachable.map((entry) => (
                  <AttachRow
                    key={entry.category}
                    entry={entry}
                    selected={selectedDocs[entry.category] || ""}
                    onChange={(documentId) => setSelectedDocs((prev) => ({ ...prev, [entry.category]: documentId }))}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[.08em] text-teal">
                <Sparkles size={12} /> SOUP's review
              </div>
              {reviewScreen === "done" && <button onClick={runReview} className="text-[11px] font-semibold text-mute hover:text-ink">Re-review</button>}
            </div>
            {(reviewScreen === "thinking" || reviewScreen === "done") && <TerminalBox lines={reviewLines} active={reviewScreen === "thinking"} />}
            {reviewScreen === "error" && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-hair bg-paper p-3 text-xs text-mute">
                <span>{reviewError}</span>
                <button onClick={runReview} className="shrink-0 font-semibold text-navy">Try again</button>
              </div>
            )}
            {reviewScreen === "done" && review && <ReviewResult review={review} />}
          </div>

          <button
            onClick={downloadFilled}
            disabled={downloading}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Download size={15} /> {downloading ? "Preparing your PDF…" : "Download filled PDF"}
          </button>
        </div>
      )}
    </div>
  );
}

// Styled like Claude Code's own terminal inside VS Code — window-chrome
// dots, a dark monospace feed, a blinking cursor while still working —
// used anywhere Companion is visibly "thinking" rather than just a plain
// spinner, so reviewing an application feels the same as watching an
// agent work.
function TerminalBox({ lines, active }: { lines: string[]; active: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#30363d] bg-[#0d1117]">
      <div className="flex items-center gap-1.5 border-b border-[#30363d] bg-[#161b22] px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
        <span className="ml-2 text-[11px] font-semibold text-[#8b949e]">SOUP Companion — {active ? "reviewing…" : "review complete"}</span>
      </div>
      <div className="min-h-[64px] px-3 py-3 font-mono text-[11.5px] leading-6 text-[#c9d1d9]">
        {lines.map((line, i) => (
          <div key={i}><span className="text-[#58a6ff]">&gt;</span> {line}</div>
        ))}
        {active && <span className="inline-block h-[13px] w-[7px] animate-pulse bg-[#c9d1d9] align-middle" />}
      </div>
    </div>
  );
}

const READINESS_COPY: Record<ApplicationReview["overallReadiness"], { label: string; className: string }> = {
  STRONG: { label: "Ready to submit", className: "bg-[#E8F4EF] text-teal" },
  NEEDS_WORK: { label: "Needs work first", className: "bg-amber-50 text-amber-700" },
  NOT_READY: { label: "Not ready yet", className: "bg-red-50 text-red-700" },
};

function ReviewResult({ review }: { review: ApplicationReview }) {
  const readiness = READINESS_COPY[review.overallReadiness] || READINESS_COPY.NEEDS_WORK;
  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-hair bg-paper p-4">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-bold ${readiness.className}`}>{readiness.label}</span>
      </div>
      <p className="text-[12.5px] leading-5 text-ink">{review.summary}</p>

      {review.strengths.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[.08em] text-teal">Strengths</div>
          <ul className="flex flex-col gap-1">
            {review.strengths.map((s, i) => <li key={i} className="text-[11.5px] leading-5 text-ink">• {s}</li>)}
          </ul>
        </div>
      )}

      {review.gaps.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[.08em] text-amber-600">What to add or fix</div>
          <ul className="flex flex-col gap-1.5">
            {review.gaps.map((g, i) => (
              <li key={i} className="text-[11.5px] leading-5 text-ink">
                <span className="font-semibold">{g.field}:</span> {g.issue}{g.suggestion ? <span className="text-mute"> — {g.suggestion}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {review.credibilityNotes.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[.08em] text-red-600">Credibility notes</div>
          <ul className="flex flex-col gap-1.5">
            {review.credibilityNotes.map((c, i) => (
              <li key={i} className="text-[11.5px] leading-5 text-ink">
                <span className="font-semibold">{c.field}</span> <span className="text-[9.5px] font-bold uppercase text-mute">({c.severity})</span> — {c.concern}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FieldInput({ field, onChange }: { field: FieldRow; onChange: (name: string, value: string) => void }) {
  return (
    <div className="rounded-xl bg-paper px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-[11.5px] font-semibold text-ink">{field.label}</div>
        {field.matchedSource && <div className="shrink-0 text-[10px] text-mute">{field.matchedSource}</div>}
      </div>
      {field.kind === "radio" || field.kind === "dropdown" || field.kind === "optionlist" ? (
        <select
          value={field.value}
          onChange={(event) => onChange(field.name, event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-hair bg-white px-2.5 py-2 text-[12.5px] text-ink"
        >
          <option value="">— Select —</option>
          {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : field.kind === "checkbox" ? (
        <select
          value={field.value || "no"}
          onChange={(event) => onChange(field.name, event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-hair bg-white px-2.5 py-2 text-[12.5px] text-ink"
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      ) : (
        <input
          value={field.value}
          onChange={(event) => onChange(field.name, event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-hair bg-white px-2.5 py-2 text-[12.5px] text-ink"
          placeholder="Type the answer for this field"
        />
      )}
    </div>
  );
}

function AttachRow({ entry, selected, onChange }: { entry: AttachableEntry; selected: string; onChange: (documentId: string) => void }) {
  if (entry.match.outcome === "SINGLE_MATCH") {
    const doc = entry.match.document;
    const checked = selected === doc.id;
    return (
      <label className="flex items-center gap-2.5 rounded-xl border border-hair bg-white px-3 py-2.5">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked ? doc.id : "")} className="h-4 w-4 accent-navy" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-semibold text-ink">{entry.label}</div>
          <div className="truncate text-[10.5px] text-mute">{doc.originalFileName || "Document"}</div>
        </div>
      </label>
    );
  }
  // AMBIGUOUS — more than one document could satisfy this category; the
  // student picks which one rather than SOUP guessing.
  return (
    <div className="rounded-xl border border-hair bg-white px-3 py-2.5">
      <div className="mb-1.5 text-[12px] font-semibold text-ink">{entry.label}</div>
      <select
        value={selected}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-hair bg-paper px-2.5 py-2 text-[12px] text-ink"
      >
        <option value="">Don&apos;t attach</option>
        {entry.match.outcome === "AMBIGUOUS" && entry.match.documents.map((doc) => (
          <option key={doc.id} value={doc.id}>{doc.originalFileName || "Document"}</option>
        ))}
      </select>
    </div>
  );
}
