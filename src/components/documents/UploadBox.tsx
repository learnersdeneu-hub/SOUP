"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, ExternalLink, Trash2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { getDocumentSignedUrl } from "@/app/actions/documents";
import { CATEGORY_CONFIG, MAX_CATEGORY_UPLOAD_BYTES, type DocumentCategory } from "@/lib/documents/categories";
import type { CategoryDocument } from "@/lib/documents/categoryQuery";

type Props = {
  category: DocumentCategory;
  label?: string;
  required?: boolean;
  multiple?: boolean;
  existing: CategoryDocument[];
  extraFormFields?: Record<string, string>;
};

// The app's first real drag-and-drop upload component, and its first use
// of XMLHttpRequest instead of fetch for an upload — fetch cannot report
// upload progress, which this box's progress bar needs. Every existing
// upload call in the codebase (uploadEvidenceFile, DirectDocumentUpload)
// uses plain fetch with no progress reporting; this is a deliberate,
// new-but-isolated technique, not a change to those paths.
//
// Follows this app's established RSC-fetches-then-passes-props
// convention: `existing` is read server-side by the caller (see
// src/lib/documents/categoryQuery.ts) and passed down, never fetched by
// this component itself. After a successful upload or delete, it calls
// router.refresh() so the parent server component re-fetches that prop
// rather than this component maintaining its own duplicate client state.
export function UploadBox({ category, label, required, multiple, existing, extraFormFields }: Props) {
  const router = useRouter();
  const config = CATEGORY_CONFIG[category];
  const isMultiple = multiple ?? config.defaultMultiple;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busyDocId, setBusyDocId] = useState<string | null>(null);

  const extList = config.extensions.join("/").toUpperCase();
  const maxMB = MAX_CATEGORY_UPLOAD_BYTES / (1024 * 1024);

  function validate(file: File): string | null {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!config.extensions.includes(ext)) return `Use ${extList} files only.`;
    if (file.size > MAX_CATEGORY_UPLOAD_BYTES) return `Files must be ${maxMB}MB or smaller.`;
    if (file.size <= 0) return "That file is empty.";
    return null;
  }

  function upload(file: File, replaceDocumentId?: string) {
    const validationError = validate(file);
    if (validationError) { setError(validationError); return; }
    setError(null);
    setUploading(true);
    setProgress(0);

    const form = new FormData();
    form.set("file", file);
    form.set("category", category);
    if (replaceDocumentId) form.set("replaceDocumentId", replaceDocumentId);
    if (extraFormFields) for (const [key, value] of Object.entries(extraFormFields)) form.set(key, value);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/documents/category-upload");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        router.refresh();
      } else {
        try { setError(JSON.parse(xhr.responseText)?.error || "Upload failed. Please try again."); }
        catch { setError("Upload failed. Please try again."); }
      }
    };
    xhr.onerror = () => { setUploading(false); setError("Upload failed. Check your connection and try again."); };
    xhr.send(form);
  }

  function handleFiles(files: FileList | null, replaceDocumentId?: string) {
    if (!files || !files.length) return;
    if (!isMultiple || replaceDocumentId) { upload(files[0], replaceDocumentId); return; }
    Array.from(files).forEach((file) => upload(file));
  }

  function startReplace(documentId: string) {
    if (!inputRef.current) return;
    inputRef.current.dataset.replaceId = documentId;
    inputRef.current.click();
  }

  async function handleView(documentId: string) {
    setBusyDocId(documentId); setError(null);
    try {
      const url = await getDocumentSignedUrl(documentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open document.");
    } finally { setBusyDocId(null); }
  }

  async function handleDelete(documentId: string) {
    setBusyDocId(documentId); setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Could not delete that document.");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete that document.");
    } finally { setBusyDocId(null); }
  }

  const showDropzone = isMultiple || existing.length === 0;

  return (
    <div className="rounded-xl border border-hair bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-ink">{label ?? config.label}</span>
        <span className={`text-[10px] font-semibold uppercase tracking-[.08em] ${required ? "text-[#B3261E]" : "text-mute"}`}>{required ? "Required" : "Optional"}</span>
      </div>

      {existing.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {existing.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-2 rounded-lg border border-hair bg-[#FAFAFA] px-3 py-2 text-xs">
              <span className="flex min-w-0 items-center gap-1.5 text-ink">
                <FileText size={13} className="shrink-0 text-mute" />
                <span className="truncate">{doc.originalFileName || "Document"}</span>
                {doc.reviewStatus === "APPROVED" && <CheckCircle2 size={13} className="shrink-0 text-teal" />}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => handleView(doc.id)} disabled={busyDocId === doc.id} className="rounded-md p-1 text-mute hover:bg-white hover:text-navy disabled:opacity-50" title="View"><ExternalLink size={13} /></button>
                {!isMultiple && (
                  <button type="button" onClick={() => startReplace(doc.id)} className="rounded-md p-1 text-mute hover:bg-white hover:text-navy" title="Replace"><RefreshCw size={13} /></button>
                )}
                <button type="button" onClick={() => handleDelete(doc.id)} disabled={busyDocId === doc.id} className="rounded-md p-1 text-mute hover:bg-white hover:text-[#B3261E] disabled:opacity-50" title="Delete"><Trash2 size={13} /></button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {showDropzone && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-5 text-center transition ${dragging ? "border-navy bg-[#EAF0F5]" : "border-hair hover:border-navy/40"}`}
        >
          <Upload size={18} className="text-mute" />
          <span className="text-xs font-medium text-ink">Drag and drop, or click to browse</span>
          <span className="text-[10px] text-mute">{extList} · up to {maxMB}MB{isMultiple ? " · multiple files allowed" : ""}</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple={isMultiple}
        accept={config.extensions.map((ext) => `.${ext}`).join(",")}
        className="hidden"
        onChange={(e) => {
          const replaceId = inputRef.current?.dataset.replaceId;
          handleFiles(e.target.files, replaceId);
          if (inputRef.current) { inputRef.current.value = ""; delete inputRef.current.dataset.replaceId; }
        }}
      />

      {uploading && (
        <div className="mt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EDEDED]"><div className="h-full rounded-full bg-navy transition-all" style={{ width: `${progress}%` }} /></div>
          <span className="mt-1 block text-[10px] text-mute">Uploading… {progress}%</span>
        </div>
      )}

      {error && <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-[#FBEAEA] px-2.5 py-1.5 text-[11px] text-[#B3261E]"><AlertCircle size={12} className="mt-0.5 shrink-0" />{error}</div>}
    </div>
  );
}
