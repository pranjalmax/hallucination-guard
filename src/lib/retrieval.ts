// src/lib/retrieval.ts
// Evidence retrieval + scoring with friendly thresholds.
// Now tolerant to both named AND default exports from vectorStore.

import { embedText } from "./embeddings";
import * as VS from "./vectorStore";

/** Looser thresholds for small docs / single-chunk cases */
export const SIM_SUPPORT = 0.27;            // cosine similarity 0..1
export const OVERLAP_SUPPORT = 0.08;        // lexical overlap 0..1

// Either-high rule: if one signal is clearly high, still support
export const EITHER_SUPPORT_SIM = 0.32;
export const EITHER_SUPPORT_OVERLAP = 0.12;

export type EvidenceItem = {
  idx: number;      // chunk index
  text: string;     // chunk text (preview)
  score: number;    // cosine similarity (higher = closer)
  overlap: number;  // lexical overlap 0..1
};

/** Cosine similarity of two equal-length Float32Array vectors */
function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** very simple tokenization; ignores short/common words */
function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP.has(t));
}

const STOP = new Set([
  "the","and","for","with","that","this","from","have","has","had","was","were",
  "are","not","but","you","your","their","its","into","about","over","out",
  "did","does","of","in","on","at","as","by","to","it","a","an"
]);

/** normalized overlap of query vs text tokens */
function overlapNorm(query: string, text: string): number {
  const q = tokens(query);
  const tset = new Set(tokens(text));
  if (q.length === 0 || tset.size === 0) return 0;
  let hit = 0;
  for (const w of q) if (tset.has(w)) hit++;
  return hit / Math.max(q.length, 1);
}

/** Try multiple known vectorStore APIs, including default export */
async function getVectorsForDocLoose(docId: string): Promise<any[]> {
  const mods = [VS as any, (VS as any)?.default].filter(Boolean);

  for (const mod of mods) {
    if (typeof mod.getVectorsForDoc === "function") return await mod.getVectorsForDoc(docId);
    if (typeof mod.getVectorsByDoc === "function") return await mod.getVectorsByDoc(docId);
    if (typeof mod.listVectorsForDoc === "function") return await mod.listVectorsForDoc(docId);
    if (typeof mod.getVectors === "function") return await mod.getVectors(docId);
    if (typeof mod.getAllVectors === "function") {
      const all = await mod.getAllVectors();
      return (all || []).filter((r: any) => r.docId === docId);
    }
  }

  throw new Error("VectorStore API not found (expected getVectorsForDoc or similar).");
}

/**
 * Retrieve top-k evidence for a claim within a selected document.
 * Returns the top items plus a coarse status (supported/unknown).
 */
export async function retrieveEvidenceForClaim(
  claimText: string,
  docId: string,
  topK = 3
): Promise<{ items: EvidenceItem[]; status: "supported" | "unknown" }> {
  // 1) embed claim
  const qvec = await embedText(claimText);

  // 2) load vectors for selected doc (tolerant API)
  //    Expected shape per item: { idx, text, vector: Float32Array | number[] }
  const chunks = await getVectorsForDocLoose(docId);

  // 3) score each chunk
  const scored: EvidenceItem[] = (chunks as any[]).map((c) => {
    const vec: Float32Array =
      c.vector instanceof Float32Array ? c.vector : new Float32Array(c.vector as number[] | ArrayLike<number>);
    const sim = cosine(qvec, vec);
    const ov = overlapNorm(claimText, String(c.text ?? ""));
    return { idx: Number(c.idx ?? 0), text: String(c.text ?? ""), score: sim, overlap: ov };
  });

  // 4) sort by similarity desc (stable enough for tiny sets)
  scored.sort((a, b) => b.score - a.score);

  // keep topK for UI
  const items = scored.slice(0, topK);

  // 5) support decision (any of topK qualifies)
  let supported = false;
  for (const it of items) {
    const phraseHit = it.text.toLowerCase().includes(claimText.toLowerCase());
    if (
      phraseHit ||
      (it.score >= SIM_SUPPORT && it.overlap >= OVERLAP_SUPPORT) ||
      (it.score >= EITHER_SUPPORT_SIM || it.overlap >= EITHER_SUPPORT_OVERLAP)
    ) {
      supported = true;
      break;
    }
  }

  return { items, status: supported ? "supported" : "unknown" };
}
