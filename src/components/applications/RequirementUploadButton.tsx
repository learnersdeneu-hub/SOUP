"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";

// Direct, AI-independent upload for one specific application requirement —
// replaces the old "Upload with Counselor" link that sent the student into
// a Noodles conversation just to reach a file picker. Posts straight to
// /api/applications/[id]/requirements/[itemId]/upload, which does the
// storage + database work with no Gemini/Counselor call anywhere in the
// path, then refreshes the page so the requirement's status (and the
// document vault) reflect the real, current server state.
export function RequirementUploadButton({ applicationId, itemId, itemTitle }: { applicationId: string; itemId: string; itemTitle: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`/api/applications/${encodeURIComponent(applicationId)}/requirements/${encodeURIComponent(itemId)}/upload`, { method: "POST", body: form });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not upload that document.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload that document.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.docx" className="hidden" onChange={handleFile} aria-label={`Upload ${itemTitle}`} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1 rounded-xl border border-hair px-3 py-2 text-[11px] font-semibold text-ink disabled:opacity-60"
      >
        {uploading ? <Loader2 size={11} className="animate-spin" /> : <FileUp size={11} />}
        {uploading ? "Uploading…" : "Upload Document"}
      </button>
      {error && <p className="mt-1 max-w-[220px] text-[10px] leading-4 text-[#9D3127]">{error}</p>}
    </div>
  );
}
