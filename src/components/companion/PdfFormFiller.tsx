"use client";

import { useRef, useState } from "react";
import { Upload, Download, Check, AlertTriangle, RotateCcw, FileText } from "lucide-react";
import type { PdfFieldInfo } from "@/lib/companion/pdfFill";
import type { DocumentMatchResult } from "@/lib/companion/documentMatch";
import type { DocumentCategory } from "@/lib/documents/categories";

type AttachableEntry = { category: DocumentCategory; label: string; match: DocumentMatchResult };
type FieldRow = PdfFieldInfo & { value: string; hadMatch: boolean };
type Screen = "idle" | "loading" | "review" | "error";

export function PdfFormFiller() {
  const [screen, setScreen] = useState<Screen>("idle");
  const [error, setError] = useState("");
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [attachable, setAttachable] = useState<AttachableEntry[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<Record<string, string>>({});
  const [downloading, setDownloading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      setScreen("review");
    } catch {
      setError("Couldn't reach SOUP right now. Check your connection and try again.");
      setScreen("error");
    }
  }

  function updateField(name: string, value: string) {
    setFields((prev) => prev.map((f) => (f.name === name ? { ...f, value } : f)));
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
          <p className="max-w-sm text-xs leading-5 text-mute">Any fillable PDF — a visa form, a university's own application PDF, anything with real form fields. SOUP reads it, fills what it can from your profile, and lets you fix the rest before you download it.</p>
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
