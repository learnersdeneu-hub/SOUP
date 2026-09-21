"use client";

export type EvidenceUploadResult = { name: string; status: "done" | "error"; detail: string };

// Shared by DirectDocumentUpload and UniversityApplyPanel so both "attach a
// document without Noodles" entry points call /api/evidence/process the same
// way, rather than each keeping its own copy of this fetch call.
export async function uploadEvidenceFile(file: File): Promise<EvidenceUploadResult> {
  try {
    const form = new FormData();
    form.append("file", file);
    form.append("workflow", "COUNSELOR");
    const response = await fetch("/api/evidence/process", { method: "POST", body: form });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Could not process that document.");
    return { name: file.name, status: "done", detail: body.analysis?.summary || "Saved to your document vault." };
  } catch (caught) {
    return { name: file.name, status: "error", detail: caught instanceof Error ? caught.message : "Could not upload document." };
  }
}
