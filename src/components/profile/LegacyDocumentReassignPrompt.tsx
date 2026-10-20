"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { reassignLegacyDocument } from "@/app/actions/reassignLegacyDocument";
import { CATEGORY_CONFIG, type DocumentCategory } from "@/lib/documents/categories";
import type { CategoryDocument } from "@/lib/documents/categoryQuery";

type LegacyDocument = CategoryDocument & { legacyType: "ACADEMIC_TRANSCRIPT" | "DEGREE_CERTIFICATE" };

// Shown above the degree-level upload boxes when the student has documents
// uploaded through the old, degree-level-agnostic Standard Documents flow
// (ACADEMIC_TRANSCRIPT / DEGREE_CERTIFICATE) that a specific new box could
// still use — rather than silently guessing which level they belong to, or
// forcing a pointless re-upload of a file SOUP already has. See plan
// decision #2.
export function LegacyDocumentReassignPrompt({ documents, candidateCategories }: { documents: LegacyDocument[]; candidateCategories: DocumentCategory[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = documents.filter((doc) => !dismissed.includes(doc.id));
  if (!visible.length || !candidateCategories.length) return null;

  async function assign(documentId: string, category: DocumentCategory) {
    setBusyId(documentId);
    try {
      await reassignLegacyDocument(documentId, category);
      setDismissed((prev) => [...prev, documentId]);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-xl border border-[#E6D9C3] bg-[#FBF4E8] p-4">
      <div className="text-xs font-semibold text-[#6B5420]">We found previously uploaded documents — tell us which one each is</div>
      <div className="mt-3 space-y-2">
        {visible.map((doc) => (
          <div key={doc.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-2.5">
            <FileText size={13} className="shrink-0 text-mute" />
            <span className="min-w-0 flex-1 truncate text-xs text-ink">{doc.originalFileName || "Document"}</span>
            {busyId === doc.id ? (
              <Loader2 size={13} className="animate-spin text-mute" />
            ) : (
              candidateCategories.map((category) => (
                <button key={category} type="button" onClick={() => assign(doc.id, category)} className="rounded-full border border-hair px-2.5 py-1 text-[11px] font-medium text-ink hover:border-navy/40">
                  {CATEGORY_CONFIG[category].label}
                </button>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
