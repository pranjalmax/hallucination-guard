// src/lib/pdf.ts
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Tell pdf.js where the worker file is (Vite will serve this URL)
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerSrc;

/**
 * Parse a PDF File entirely in the browser.
 * Calls onProgress(page, total) after each page is extracted.
 */
export async function parsePdfFile(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<{ text: string; pages: number }> {
  const buf = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buf });
  const pdf = await loadingTask.promise;

  let combined = "";
  const total = pdf.numPages;

  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = (content.items as any[]).map((it) => (it && it.str) || "");
    const pageText = strings.join(" ").replace(/\s+/g, " ").trim();

    // Add a clear page divider (helpful for later debugging)
    combined += `\n\n--- Page ${i} ---\n${pageText}`;

    onProgress?.(i, total);
  }

  return { text: combined.trim(), pages: total };
}
