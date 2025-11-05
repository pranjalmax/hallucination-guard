// src/lib/chunkText.ts

export type Chunk = {
  idx: number;
  start: number;
  end: number;
  text: string;
};

/**
 * Simple character-window chunker with overlap.
 * Defaults: ~1000 char window, 150 char overlap.
 */
export function chunkText(
  input: string,
  windowSize = 1000,
  overlap = 150
): Chunk[] {
  const text = input.replace(/\r\n/g, "\n").trim();
  const chunks: Chunk[] = [];
  if (!text) return chunks;

  let start = 0;
  let idx = 0;
  while (start < text.length) {
    const end = Math.min(start + windowSize, text.length);
    const slice = text.slice(start, end);

    chunks.push({
      idx,
      start,
      end,
      text: slice.trim(),
    });

    if (end === text.length) break;
    start = end - overlap; // step forward with overlap
    idx += 1;
  }

  return chunks;
}
