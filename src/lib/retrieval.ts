// src/lib/retrieval.ts
import { embedText } from "./embeddings";
import { getVectorsByDocId, topK, type VectorRecord } from "./vectorStore";

/** very small stopword list for overlap scoring */
const STOP = new Set([
  "the","a","an","and","or","to","of","in","on","for","with",
  "is","are","was","were","be","been","being","as","by","at",
  "from","that","this","these","those","it","its","their","his","her",
  "we","you","they","i","our","your","their","there","here"
]);

/** tokenize to lowercase words/numbers, filter short words/stopwords */
function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter(w => w.length > 2 && !STOP.has(w));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  if (a.size === 0 && b.size === 0) return 0;
  const uni = a.size + b.size - inter;
  return uni ? inter / uni : 0;
}

export type EvidenceItem = {
  idx: number;
  text: string;
  score: number;     // cosine on normalized vectors
  overlap: number;   // simple token-Jaccard with claim
  start: number;
  end: number;
};

export type EvidenceResult = {
  status: "supported" | "unknown";
  items: EvidenceItem[];
};

/**
 * Retrieve and score evidence for a claim text against one document.
 * Requires embeddings already computed for that doc.
 */
export async function retrieveEvidenceForClaim(
  claimText: string,
  docId: string,
  k = 5
): Promise<EvidenceResult> {
  const qvec = await embedText(claimText);
  const items = await getVectorsByDocId(docId);
  if (!items.length) {
    return { status: "unknown", items: [] };
  }

  // top-k by cosine
  const top = topK(qvec, items, k);

  // compute a simple overlap score between the claim tokens and each chunk
  const claimSet = new Set(tokenize(claimText));
  const scored: EvidenceItem[] = top.map((r) => {
    const chunkSet = new Set(tokenize(r.text));
    const overlap = jaccard(claimSet, chunkSet);
    return {
      idx: r.idx,
      text: r.text,
      score: r.score,
      overlap,
      start: r.start,
      end: r.end,
    };
  });

  // decide status: supported if either similarity or token overlap is strong
  const best = scored[0];
  const SIM_THRESHOLD = 0.60;     // cosine on normalized vectors (0..1)
  const OVERLAP_THRESHOLD = 0.35; // token-jaccard threshold
  const supported = best && (best.score >= SIM_THRESHOLD || best.overlap >= OVERLAP_THRESHOLD);

  return {
    status: supported ? "supported" : "unknown",
    items: scored,
  };
}
