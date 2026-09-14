import { transcribeScannedDocument } from "@/lib/documents/vision";

export const MAX_EVIDENCE_BYTES = 15 * 1024 * 1024;
export type DocumentExtraction = { text: string; method: "TEXT" | "OCR" | "VISION" };

function extension(name: string) {
  return name.toLowerCase().split(".").pop() || "";
}

function useful(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length >= 80 && /[A-Za-z0-9]{3}/.test(normalized);
}

export async function extractDocument(file: File): Promise<DocumentExtraction> {
  if (!file || file.size === 0) throw new Error("Choose a document to upload.");
  if (file.size > MAX_EVIDENCE_BYTES) throw new Error("Documents must be 15 MB or smaller.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = extension(file.name);
  const mime = file.type.toLowerCase();

  if (mime === "application/pdf" || ext === "pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    let text = "";
    try { text = (await pdfParse(buffer)).text || ""; } catch { /* scanned/malformed PDF: vision fallback below */ }
    if (useful(text)) return { text, method: "TEXT" };
    const visionText = await transcribeScannedDocument(buffer, "application/pdf");
    if (!useful(visionText)) throw new Error("SOUP could not read enough information from that scan. Try a clearer scan or another document.");
    return { text: visionText, method: "VISION" };
  }
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || ext === "docx") {
    const mammoth = await import("mammoth");
    const text = (await mammoth.extractRawText({ buffer })).value;
    if (!useful(text)) throw new Error("SOUP could not read enough information from that document.");
    return { text, method: "TEXT" };
  }
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg"].includes(ext)) {
    let text = "";
    try {
      const { recognize } = await import("tesseract.js");
      text = (await recognize(buffer, "eng", { logger: () => undefined })).data.text || "";
    } catch { /* vision fallback below */ }
    if (useful(text)) return { text, method: "OCR" };
    const normalizedMime = mime.startsWith("image/") ? mime : ext === "png" ? "image/png" : "image/jpeg";
    const visionText = await transcribeScannedDocument(buffer, normalizedMime);
    if (!useful(visionText)) throw new Error("SOUP could not read enough information from that image. Try a clearer image.");
    return { text: visionText, method: "VISION" };
  }
  throw new Error("Use a PDF, DOCX, PNG, JPG or JPEG document.");
}

// Backward-compatible helper for any existing callers.
export async function extractDocumentText(file: File) {
  return (await extractDocument(file)).text;
}
