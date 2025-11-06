// src/lib/retrieval.ts

import { embedText } from "./embeddings";
import { getVectorsByDocId, type VectorRecord } from "./vectorStore";
import { scoreEvidence, type EvidenceLabel } from "./scoring";

/**
 * Evidence item shape used by the UI.
 */
export type EvidenceItem = {
  /** Chunk index */
  idx: number;
  /** Chunk text */
  text: string;
  /** Embedding similarity (cosine 0..1) */
  score: number;
  /** Lexical overlap ratio (0..1) from scoring.ts */
  overlap: number;
  /** Per-chunk label for debugging / future UI */
  label: EvidenceLabel;
};

function toFloat32(v: Float32Array | number[] | any): Float32Array {
  if (v instanceof Float32Array) return v;
  if (Array.isArray(v)) return new Float32Array(v);
  return new Float32Array(v as ArrayLike<number>);
}

/**
 * Simple cosine similarity between two vectors.
 */
function cosine(a: Float32Array, b: Float32Array | number[]): number {
  const bv = toFloat32(b);
  const n = Math.min(a.length, bv.length);
  if (!n) return 0;

  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i];
    const y = bv[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Retrieve top-k evidence chunks for a claim and summarize an overall status.
 *
 * Public status is currently:
 * - "supported" if we saw at least one supported chunk and no contradictions.
 * - "unknown"  otherwise (includes conflicting evidence).
 *
 * Each EvidenceItem keeps its own `label` for future UI tweaks.
 */
export async function retrieveEvidenceForClaim(
  claimText: string,
  docId: string,
  k = 5
): Promise<{ status: "supported" | "unknown"; items: EvidenceItem[] }> {
  const claim = (claimText || "").trim();
  if (!claim) {
    return { status: "unknown", items: [] };
  }

  const rows: VectorRecord[] = await getVectorsByDocId(docId);
  if (!rows || rows.length === 0) {
    throw new Error("No embeddings stored for this document.");
  }

  const qvec = await embedText(claim);

  // rank chunks by embedding similarity
  const ranked = rows
    .map((row) => ({
      row,
      sim: cosine(qvec, row.vector as any),
    }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, Math.max(1, Math.min(k, rows.length)));

  const items: EvidenceItem[] = [];
  let sawSupported = false;
  let sawContradiction = false;

  for (const { row, sim } of ranked) {
    const { label, overlap } = scoreEvidence(claim, row.text);

    items.push({
      idx: row.idx,
      text: row.text,
      score: sim,
      overlap,
      label,
    });

    if (label === "supported") sawSupported = true;
    if (label === "contradiction") sawContradiction = true;
  }

  // Collapse into a simple status for the current UI:
  // - any contradiction => unknown (flagged; don't over-trust)
  // - else if any supported => supported
  // - else unknown
  const status: "supported" | "unknown" =
    sawContradiction ? "unknown" : sawSupported ? "supported" : "unknown";

  return { status, items };
}
