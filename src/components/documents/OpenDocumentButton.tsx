"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { getDocumentSignedUrl } from "@/app/actions/documents";
import { getAdminDocumentSignedUrl } from "@/app/actions/adminDocuments";

export function OpenDocumentButton({ documentId, admin = false }: { documentId: string; admin?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function open() {
    setLoading(true); setError(null);
    try {
      const url = admin ? await getAdminDocumentSignedUrl(documentId) : await getDocumentSignedUrl(documentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open document.");
    } finally { setLoading(false); }
  }
  return <div className="text-right"><button onClick={open} disabled={loading} className="inline-flex items-center gap-1 rounded-lg border border-hair px-3 py-2 text-xs font-semibold text-ink hover:bg-[#FAFAFA] disabled:opacity-50"><ExternalLink size={13}/>{loading ? "Opening…" : "Open securely"}</button>{error ? <div className="mt-1 max-w-48 text-[11px] text-red-600">{error}</div> : null}</div>;
}
