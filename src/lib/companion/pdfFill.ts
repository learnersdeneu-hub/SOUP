import { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList, PDFName, PDFString, PDFHexString, StandardFonts } from "pdf-lib";
import { classifyFieldText } from "./fieldDictionary";
import type { AnswerEntry } from "./answerBank";

export type PdfFieldKind = "text" | "checkbox" | "radio" | "dropdown" | "optionlist" | "unsupported";

export type PdfFieldInfo = {
  name: string;
  kind: PdfFieldKind;
  label: string;
  options?: string[];
  matchedKey: string | null;
  matchedValue: string | null;
  matchedSource: string | null;
};

// AcroForm field tooltips (the "TU" key) are the closest thing a PDF has to
// an HTML <label> — most well-authored government/university forms set one
// per field. Falls back to null (never thrown) so a form with no tooltips
// at all still works, just matched on field name alone.
function fieldTooltip(field: { acroField: { dict: { lookupMaybe: (name: PDFName, t1: typeof PDFString, t2: typeof PDFHexString) => PDFString | PDFHexString | undefined } } }): string | null {
  try {
    const raw = field.acroField.dict.lookupMaybe(PDFName.of("TU"), PDFString, PDFHexString);
    return raw ? raw.decodeText() : null;
  } catch {
    return null;
  }
}

function humanizeFieldName(name: string): string {
  const last = name.split(".").pop() || name;
  const spaced = last.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim();
  return spaced || name;
}

function safeOptions(getOptions: () => string[]): string[] {
  try {
    return getOptions();
  } catch {
    return [];
  }
}

// Same loose matching every other part of Companion uses for a choice
// field (select/radio): exact match first, then a substring match either
// direction, since a PDF's own option labels ("Male" vs a SOUP value of
// "male") rarely match a stored answer byte-for-byte.
function pickOption(options: string[], want: string): string | null {
  const normalizedWant = want.trim().toLowerCase();
  if (!normalizedWant) return null;
  const exact = options.find((option) => option.trim().toLowerCase() === normalizedWant);
  if (exact) return exact;
  const partial = options.find((option) => {
    const normalizedOption = option.trim().toLowerCase();
    return normalizedOption.includes(normalizedWant) || normalizedWant.includes(normalizedOption);
  });
  return partial || null;
}

// Classifies every AcroForm field in an uploaded PDF against the same
// answer-bank keys the desktop app fills HTML forms from, and reports what
// it would fill if asked to — without modifying anything yet. The caller
// (the review screen) shows this, lets the student correct it, then calls
// fillPdfFields with the final values.
export async function inspectPdfFields(bytes: Uint8Array | Buffer, answerBank: Record<string, AnswerEntry>): Promise<PdfFieldInfo[]> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const form = doc.getForm();
  const out: PdfFieldInfo[] = [];

  for (const field of form.getFields()) {
    const name = field.getName();
    const tooltip = fieldTooltip(field as unknown as Parameters<typeof fieldTooltip>[0]);
    const label = tooltip || humanizeFieldName(name);
    const dictEntry = classifyFieldText(`${tooltip || ""} ${name}`);
    const matchedKey = dictEntry?.key || null;
    const answer = matchedKey ? answerBank[matchedKey] : undefined;

    let kind: PdfFieldKind = "unsupported";
    let options: string[] | undefined;
    if (field instanceof PDFTextField) kind = "text";
    else if (field instanceof PDFCheckBox) kind = "checkbox";
    else if (field instanceof PDFRadioGroup) { kind = "radio"; options = safeOptions(() => field.getOptions()); }
    else if (field instanceof PDFDropdown) { kind = "dropdown"; options = safeOptions(() => field.getOptions()); }
    else if (field instanceof PDFOptionList) { kind = "optionlist"; options = safeOptions(() => field.getOptions()); }

    let matchedValue: string | null = null;
    if (answer) {
      if (kind === "text") matchedValue = answer.value;
      else if (options && options.length) matchedValue = pickOption(options, answer.value);
    }

    out.push({ name, kind, label, options, matchedKey, matchedValue, matchedSource: matchedValue ? answer!.source : null });
  }

  return out;
}

// Applies a final name->value map (the review screen's edited values, not
// necessarily the same as inspectPdfFields's suggestions) to the real PDF.
// One field failing to set (a malformed widget, an unexpected field
// subtype) never aborts the rest — same "don't let one bad field sink the
// whole fill" posture as the desktop app's HTML form filler.
export async function fillPdfFields(bytes: Uint8Array | Buffer, values: Record<string, string>): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const form = doc.getForm();

  for (const field of form.getFields()) {
    const raw = values[field.getName()];
    if (raw == null || raw === "") continue;
    try {
      if (field instanceof PDFTextField) field.setText(raw);
      else if (field instanceof PDFCheckBox) { if (/^(yes|true|1|on|checked)$/i.test(raw.trim())) field.check(); else field.uncheck(); }
      else if (field instanceof PDFRadioGroup) { const option = pickOption(field.getOptions(), raw); if (option) field.select(option); }
      else if (field instanceof PDFDropdown) { const option = pickOption(field.getOptions(), raw); if (option) field.select(option); }
      else if (field instanceof PDFOptionList) { const option = pickOption(field.getOptions(), raw); if (option) field.select(option); }
    } catch {
      // Leave this one field unfilled rather than failing the whole document.
    }
  }

  return doc.save();
}

export type PdfAttachment = { bytes: Buffer; mime: string; label: string };

// Appends the student's supporting documents (passport scan, photo,
// transcripts, etc.) to the end of the filled form so the download is one
// complete, submission-ready file instead of several separate ones. A PDF
// attachment is merged page-for-page; an image gets its own new page, fit
// to an A4 sheet with a small caption so it's clear what it is once
// printed or re-opened without this tool.
export async function appendAttachments(pdfBytes: Uint8Array, attachments: PdfAttachment[]): Promise<Uint8Array> {
  if (!attachments.length) return pdfBytes;
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (const attachment of attachments) {
    if (attachment.mime === "application/pdf") {
      try {
        const sourceDoc = await PDFDocument.load(attachment.bytes, { ignoreEncryption: true, updateMetadata: false });
        const copiedPages = await doc.copyPages(sourceDoc, sourceDoc.getPageIndices());
        copiedPages.forEach((page) => doc.addPage(page));
      } catch {
        // Skip a supporting document that fails to parse rather than failing the whole download.
      }
      continue;
    }

    let image;
    try {
      image = attachment.mime === "image/png" ? await doc.embedPng(attachment.bytes) : await doc.embedJpg(attachment.bytes);
    } catch {
      continue;
    }
    const page = doc.addPage([595.28, 841.89]); // A4
    const margin = 40;
    const maxWidth = page.getWidth() - margin * 2;
    const maxHeight = page.getHeight() - margin * 2 - 30;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    const width = image.width * scale;
    const height = image.height * scale;
    page.drawText(attachment.label.slice(0, 90), { x: margin, y: page.getHeight() - margin, size: 11, font });
    page.drawImage(image, { x: (page.getWidth() - width) / 2, y: (page.getHeight() - height) / 2 - 15, width, height });
  }

  return doc.save();
}
