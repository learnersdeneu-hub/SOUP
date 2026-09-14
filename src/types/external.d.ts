declare module "pdf-parse" {
  type PdfParseResult = { text: string; numpages?: number; info?: unknown };
  export default function pdfParse(dataBuffer: Buffer): Promise<PdfParseResult>;
}
