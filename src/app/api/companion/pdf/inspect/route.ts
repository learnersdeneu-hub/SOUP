import { requireApiProfile } from "@/lib/auth/apiUser";
import { buildAnswerBank } from "@/lib/companion/answerBank";
import { inspectPdfFields } from "@/lib/companion/pdfFill";
import { matchDocumentsForCategory } from "@/lib/companion/documentMatch";
import { DOCUMENT_CATEGORIES, CATEGORY_CONFIG } from "@/lib/documents/categories";
import { logServerError } from "@/lib/logging/safe";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_PDF_BYTES = 20 * 1024 * 1024;

// Step 1 of the PDF form filler (src/app/companion/pdf): reads a blank
// application PDF's AcroForm fields and reports what Companion would fill
// in each one from the student's SOUP profile, plus which supporting
// documents (passport, transcripts, etc.) are available to attach — all
// without writing anything yet. The review screen lets the student correct
// any of this before POST /api/companion/pdf/fill actually produces the
// download. The uploaded bytes are never persisted — read, inspected, and
// discarded within this request.
export async function POST(request: Request) {
  const current = await requireApiProfile();
  if (!current.ok) return current.response;
  const { user, profile } = current;

  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "Invalid upload." }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Choose a PDF application form to upload." }, { status: 400 });
  if (file.size > MAX_PDF_BYTES) return Response.json({ error: "That PDF is larger than 20MB." }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") return Response.json({ error: "That file doesn't look like a PDF." }, { status: 415 });

  const { answerBank } = await buildAnswerBank(profile.id, {
    fullName: user.fullName,
    email: user.email,
    dateOfBirth: user.dateOfBirth,
    nationality: user.nationality,
    currentCountry: user.currentCountry,
  });

  let fields;
  try {
    fields = await inspectPdfFields(buffer, answerBank);
  } catch (error) {
    logServerError("COMPANION_PDF_INSPECT_ERROR", error);
    return Response.json({ error: "Couldn't read that PDF's form fields — it may be a scanned image rather than a fillable form, corrupted, or password-protected." }, { status: 400 });
  }
  if (fields.length === 0) {
    return Response.json({ error: "SOUP couldn't find any fillable form fields in that PDF. Some scanned forms don't have real fields — only genuinely fillable PDFs (the kind that highlight boxes when opened in Acrobat) can be filled this way." }, { status: 400 });
  }

  const attachable = (
    await Promise.all(
      DOCUMENT_CATEGORIES.map(async (category) => ({
        category,
        label: CATEGORY_CONFIG[category].label,
        match: await matchDocumentsForCategory(profile.id, category),
      })),
    )
  ).filter((entry) => entry.match.outcome !== "NO_MATCH");

  return Response.json({ fields, attachable });
}
