// Plain-text extraction from a PDF buffer (pdf-parse v2). Shared by document
// uploads and resume import. pdf-parse is listed in next.config.mjs
// serverExternalPackages so it loads from node_modules at runtime with its
// own PDF.js worker, rather than being bundled (bundling breaks the worker).
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text || "";
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}
