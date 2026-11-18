import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { extractPdfText } from "@/lib/documents/pdfText";

// Guards the pdf-parse v2 integration used by document uploads and resume
// import: a real PDF in, its text out.
describe("extractPdfText", () => {
  it("extracts the text of a generated PDF", async () => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    pdf.addPage().drawText("Bachelor of Business Administration, University of Debrecen", { x: 40, y: 700, size: 12, font });
    pdf.addPage().drawText("IELTS 7.0", { x: 40, y: 700, size: 12, font });
    const text = await extractPdfText(Buffer.from(await pdf.save()));
    expect(text).toContain("University of Debrecen");
    expect(text).toContain("IELTS 7.0");
  });

  it("rejects a buffer that is not a PDF", async () => {
    await expect(extractPdfText(Buffer.from("not a pdf"))).rejects.toBeTruthy();
  });
});
