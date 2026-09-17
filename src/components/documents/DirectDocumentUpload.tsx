"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";

// A student-facing upload entry point that works even without going through
// Noodles first. It calls the same /api/evidence/process endpoint Noodles
// uses when a student attaches a file mid-conversation (see the hidden
// <input type="file"> in CounselorConversation.tsx) — same secure storage
// upload, same AI extraction/analysis, same document-vault record and
// notifications. There is no separate "direct upload" architecture, only a
// second entry point into the existing one, mirroring what
// DirectApplicationBox already does for starting an application.
export function DirectDocumentUpload() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ name: string; summary: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("workflow", "COUNSELOR");
      const response = await fetch("/api/evidence/process", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not process that document.");
      setResult({ name: file.name, summary: body.analysis?.summary || "Saved to your document vault." });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload document.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-hair bg-white p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Direct Document Upload</div>
      <h2 className="mt-2 text-sm font-semibold text-ink">Upload a document without Noodles</h2>
      <p className="mt-1 text-xs leading-5 text-mute">Passport, transcript, offer letter or other evidence — SOUP reads and files it the same way it does inside a Noodles conversation.</p>
      <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.docx" className="hidden" onChange={handleFile} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        {uploading ? <Loader2 size={12} className="animate-spin" /> : <FileUp size={13} />}
        {uploading ? "Reading document…" : "Upload document"}
      </button>
      {result && <p className="mt-2 text-[11px] leading-4 text-teal">{result.name} saved. {result.summary}</p>}
      {error && <p className="mt-2 text-[11px] leading-4 text-[#9D3127]">{error}</p>}
    </div>
  );
}
