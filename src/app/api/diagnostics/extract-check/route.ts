// Temporary diagnostic route — directly exercises the same code paths as a
// real document upload (tesseract.js OCR, then the Gemini Vision fallback)
// against a tiny embedded test image, with per-step timing, instead of
// trying to interpret ambiguous mixed build/runtime logs. Safe to delete
// after use.
import { transcribeScannedDocument } from "@/lib/documents/vision";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// A tiny 300x100 PNG reading "HELLO WORLD TEST" in black text on white.
const TEST_IMAGE_BASE64 = "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";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => setTimeout(() => reject(new Error(`${label} did not respond within ${ms}ms`)), ms)),
  ]);
}

export async function GET() {
  const results: Record<string, unknown> = {};
  const buffer = Buffer.from(TEST_IMAGE_BASE64, "base64");

  // Step 1: tesseract.js import + worker OCR — the suspected problem path.
  const tesseractStart = Date.now();
  try {
    const { recognize } = await withTimeout(import("tesseract.js"), 5_000, "tesseract.js import");
    const result = await withTimeout(recognize(buffer, "eng", { logger: () => undefined }), 20_000, "tesseract.js recognize()");
    results.tesseract = { ok: true, ms: Date.now() - tesseractStart, textPreview: (result.data.text || "").slice(0, 60) };
  } catch (error) {
    results.tesseract = { ok: false, ms: Date.now() - tesseractStart, error: error instanceof Error ? error.message : String(error) };
  }

  // Step 2: Gemini Vision fallback — should work independently of tesseract.
  const visionStart = Date.now();
  try {
    const text = await withTimeout(transcribeScannedDocument(buffer, "image/png"), 30_000, "Gemini Vision");
    results.vision = { ok: true, ms: Date.now() - visionStart, textPreview: text.slice(0, 60) };
  } catch (error) {
    results.vision = { ok: false, ms: Date.now() - visionStart, error: error instanceof Error ? error.message : String(error) };
  }

  return Response.json(results);
}
