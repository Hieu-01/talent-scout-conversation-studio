/** Extract plain text from a PDF or DOCX in the browser. */
export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buf = await file.arrayBuffer();
  if (name.endsWith(".pdf")) {
    const { extractText: pdf, getDocumentProxy } = await import("unpdf");
    const doc = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await pdf(doc, { mergePages: true });
    return text;
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
    return value;
  }
  if (name.endsWith(".txt")) return new TextDecoder().decode(buf);
  throw new Error("Unsupported file type — use PDF or Word (.docx)");
}
