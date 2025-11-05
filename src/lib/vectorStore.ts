// src/lib/vectorStore.ts
import localforage from "localforage";
import type { Chunk } from "./chunkText";

const vectorsStore = localforage.createInstance({
  name: "hg",
  storeName: "vectors",
});

export type VectorRecord = {
  docId: string;
  idx: number;
  dims: number;
  start: number;
  end: number;
  text: string;
  vector: number[]; // stored as plain array (we convert to Float32Array on read)
};

export async function hasVectorsForDoc(docId: string): Promise<boolean> {
  const keys = await vectorsStore.keys();
  return keys.some((k) => k.startsWith(docId + ":"));
}

export async function saveVectors(
  docId: string,
  chunks: Chunk[],
  vectors: Float32Array[]
) {
  if (chunks.length !== vectors.length) {
    throw new Error("chunks and vectors length mismatch");
  }
  const dims = vectors[0]?.length ?? 0;
  await Promise.all(
    chunks.map((c, i) =>
      vectorsStore.setItem(`${docId}:${c.idx}`, {
        docId,
        idx: c.idx,
        dims,
        start: c.start,
        end: c.end,
        text: c.text,
        vector: Array.from(vectors[i]),
      } as VectorRecord)
    )
  );
}

export async function getVectorsByDocId(docId: string): Promise<VectorRecord[]> {
  const keys = await vectorsStore.keys();
  const mine = keys.filter((k) => k.startsWith(docId + ":"));
  mine.sort((a, b) => {
    const ai = parseInt(a.split(":")[1] || "0", 10);
    const bi = parseInt(b.split(":")[1] || "0", 10);
    return ai - bi;
  });

  const out: VectorRecord[] = [];
  for (const k of mine) {
    const v = (await vectorsStore.getItem(k)) as VectorRecord | null;
    if (v) out.push(v);
  }
  return out;
}

/** Cosine for normalized vectors reduces to dot product */
export function cosine(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export function topK(
  query: Float32Array,
  items: VectorRecord[],
  k = 5
): Array<VectorRecord & { score: number }> {
  const withScores = items.map((it) => {
    const v = Float32Array.from(it.vector);
    return { ...it, score: cosine(query, v) };
  });
  withScores.sort((a, b) => b.score - a.score);
  return withScores.slice(0, k);
}

/** Remove all vectors for a doc (if you re-chunk or want to re-embed) */
export async function deleteVectorsForDoc(docId: string) {
  const keys = await vectorsStore.keys();
  const mine = keys.filter((k) => k.startsWith(docId + ":"));
  await Promise.all(mine.map((k) => vectorsStore.removeItem(k)));
}
