"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { uploadEvidenceFile, type EvidenceUploadResult } from "@/lib/documents/uploadEvidence";

// A student-facing upload entry point that works even without going through
// Noodles first. It calls the same /api/evidence/process endpoint Noodles
// uses when a student attaches a file mid-conversation (see the hidden
// <input type="file"> in CounselorConversation.tsx) — same secure storage
// upload, same AI extraction/analysis, same document-vault record and
// notifications. There is no separate "direct upload" architecture, only a
// second entry point into the existing one, mirroring what
// DirectApplicationBox already does for starting an application.
//
// Accepts multiple files at once: each is still processed as its own
// request against /api/evidence/process (that endpoint's contract is
// one-file-per-call, and each file genuinely needs its own AI read), but the
// student picks them all in one go and sees one combined result list instead
// of repeating the picker per document.
export function DirectDocumentUpload() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<EvidenceUploadResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setUploading(true);
    setError(null);
    setResults([]);
    setProgress({ done: 0, total: files.length });
    const collected: EvidenceUploadResult[] = [];
    for (const file of files) {
      const result = await uploadEvidenceFile(file);
      collected.push(result);
      setResults([...collected]);
      setProgress({ done: collected.length, total: files.length });
    }
    router.refresh();
    setUploading(false);
  }

  return (
    <div className="rounded-2xl border border-hair bg-white p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-teal">Direct Document Upload</div>
      <h2 className="mt-2 text-sm font-semibold text-ink">Upload documents without Noodles</h2>
      <p className="mt-1 text-xs leading-5 text-mute">Passport, transcript, offer letter or other evidence — select one or several at once. SOUP reads and files each the same way it does inside a Noodles conversation.</p>
      <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.docx" multiple className="hidden" onChange={handleFiles} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        {uploading ? <Loader2 size={12} className="animate-spin" /> : <FileUp size={13} />}
        {uploading ? `Reading ${progress?.done ?? 0} of ${progress?.total ?? 0}…` : "Upload documents"}
      </button>
      {results.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {results.map((item, index) => (
            <li key={`${item.name}-${index}`} className={`flex items-start gap-1.5 text-[11px] leading-4 ${item.status === "error" ? "text-[#9D3127]" : "text-teal"}`}>
              {item.status === "done" && <CheckCircle2 size={12} className="mt-0.5 shrink-0" />}
              <span><strong className="font-semibold">{item.name}</strong> — {item.detail}</span>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-2 text-[11px] leading-4 text-[#9D3127]">{error}</p>}
    </div>
  );
}
