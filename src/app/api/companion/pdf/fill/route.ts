import { requireApiProfile } from "@/lib/auth/apiUser";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { fillPdfFields, appendAttachments, type PdfAttachment } from "@/lib/companion/pdfFill";
import { logServerError } from "@/lib/logging/safe";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_PDF_BYTES = 20 * 1024 * 1024;

function inferMime(name: string | null): string {
  const ext = (name || "").toLowerCase().split(".").pop();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "application/pdf";
}

// Step 2: takes the same PDF (re-uploaded — nothing from step 1 was kept
// server-side), the review screen's final field values, and the ids of
// whichever of the student's own documents they chose to attach, and
// streams back one finished, submission-ready PDF: the form filled in,
// plus the chosen documents appended as extra pages at the end.
export async function POST(request: Request) {
  const current = await requireApiProfile();
  if (!current.ok) return current.response;
  const { profile } = current;

  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "Invalid upload." }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Choose a PDF application form to upload." }, { status: 400 });
  if (file.size > MAX_PDF_BYTES) return Response.json({ error: "That PDF is larger than 20MB." }, { status: 413 });

  let values: Record<string, string> = {};
  try {
    const parsed = JSON.parse(String(form.get("values") || "{}"));
    if (parsed && typeof parsed === "object") values = parsed;
  } catch { /* malformed values payload — fill with nothing rather than failing the whole request */ }

  let attachDocumentIds: string[] = [];
  try {
    const parsed = JSON.parse(String(form.get("attachDocumentIds") || "[]"));
    if (Array.isArray(parsed)) attachDocumentIds = parsed.filter((id): id is string => typeof id === "string");
  } catch { /* ignore malformed attach list */ }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") return Response.json({ error: "That file doesn't look like a PDF." }, { status: 415 });

  let filled: Uint8Array;
  try {
    filled = await fillPdfFields(buffer, values);
  } catch (error) {
    logServerError("COMPANION_PDF_FILL_ERROR", error);
    return Response.json({ error: "Couldn't fill that PDF — it may be corrupted or password-protected." }, { status: 400 });
  }

  if (attachDocumentIds.length > 0) {
    // Only ever this student's own vault — the id list comes from the
    // browser and is never trusted beyond "which of this profile's own
    // documents to attach."
    const documents = await prisma.document.findMany({
      where: { id: { in: attachDocumentIds }, profileId: profile.id },
      select: { id: true, storageRef: true, originalFileName: true, documentType: true },
    });
    const supabase = createClient();
    const attachments: PdfAttachment[] = [];
    for (const document of documents) {
      const { data, error } = await supabase.storage.from("documents").download(document.storageRef);
      if (error || !data) continue;
      const mime = data.type || inferMime(document.originalFileName);
      attachments.push({ bytes: Buffer.from(await data.arrayBuffer()), mime, label: document.originalFileName || document.documentType });
    }
    try {
      filled = await appendAttachments(filled, attachments);
    } catch (error) {
      logServerError("COMPANION_PDF_ATTACH_ERROR", error);
      // The filled form itself is still good even if appending documents failed — ship that rather than nothing.
    }
  }

  return new Response(Buffer.from(filled), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="soup-application-filled.pdf"',
    },
  });
}
