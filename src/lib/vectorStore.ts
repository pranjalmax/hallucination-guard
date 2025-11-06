// src/lib/vectorStore.ts
// Robust vector store using IndexedDB (localForage).
// Exposes both the "new" API and older helper names used elsewhere (VectorRecord, topK, etc.).

import localforage from "localforage";

/** Stored row shape (for IndexedDB) */
type RowStored = {
  id: string;
  docId: string;
  idx: number;
  text: string;
  page?: number;
  start?: number;
  end?: number;
  vector: number[]; // store as number[] for IndexedDB safety
};

/** Runtime row shape returned to callers */
export type VectorRecord = Omit<RowStored, "vector"> & { vector: Float32Array };

const VEC = localforage.createInstance({
  name: "hallucination-guard",
  storeName: "vectors-v1",
});
const META = localforage.createInstance({
  name: "hallucination-guard",
  storeName: "docs-v1",
});

function toStored(docId: string, r: any): RowStored {
  const id = r.id ?? `${docId}:${r.idx ?? 0}`;
  const vec =
    r.vector instanceof Float32Array
      ? Array.from(r.vector as Float32Array)
      : (r.vector ?? []);
  return {
    id: String(id),
    docId,
    idx: Number(r.idx ?? 0),
    text: String(r.text ?? ""),
    page: r.page ?? undefined,
    start: r.start ?? undefined,
    end: r.end ?? undefined,
    vector: vec as number[],
  };
}
function toOut(r: RowStored): VectorRecord {
  return { ...r, vector: new Float32Array(r.vector) };
}

/** Save or replace all vectors for a document. */
export async function saveVectorsForDoc(
  docId: string,
  rows: any[]
): Promise<void> {
  const key = `doc:${docId}`;
  const stored = (rows || []).map((r, i) => toStored(docId, { idx: i, ...r }));
  await VEC.setItem(key, stored);
  await META.setItem(`meta:${docId}`, {
    id: docId,
    count: stored.length,
    ts: Date.now(),
  });
}

/** Return vectors for one document (as Float32Array). */
export async function getVectorsForDoc(docId: string): Promise<VectorRecord[]> {
  const key = `doc:${docId}`;
  const arr = (await VEC.getItem<RowStored[]>(key)) || [];
  return arr.map(toOut);
}

/** Remove one doc’s vectors. */
export async function deleteVectorsForDoc(docId: string): Promise<void> {
  await VEC.removeItem(`doc:${docId}`);
  await META.removeItem(`meta:${docId}`);
}

/** List known doc ids. */
export async function listDocs(): Promise<string[]> {
  const ids: string[] = [];
  await META.iterate<any, void>((value, key) => {
    if (key.startsWith("meta:")) ids.push(key.slice(5));
  });
  return ids;
}

/** Flatten all vectors across docs (rarely needed; handy for loose callers). */
export async function getAllVectors(): Promise<VectorRecord[]> {
  const out: VectorRecord[] = [];
  await VEC.iterate<RowStored[], void>((value, key) => {
    if (!key.startsWith("doc:")) return;
    for (const r of value || []) out.push(toOut(r));
  });
  return out;
}

/** Quick existence check for a doc’s vectors (older helper name expected by some code). */
export async function hasVectorsForDoc(docId: string): Promise<boolean> {
  const key = `doc:${docId}`;
  const arr = (await VEC.getItem<RowStored[]>(key)) || [];
  return arr.length > 0;
}

/** Small generic helper some code imports from here. */
export function topK<T>(
  items: T[],
  k: number,
  score: (x: T) => number
): T[] {
  return [...items].sort((a, b) => score(b) - score(a)).slice(0, k);
}

/* -----------------------------
   Synonyms to match older imports
   ----------------------------- */
// saveVectors
export const saveVectors = saveVectorsForDoc;
// getVectorsByDocId
export const getVectorsByDocId = getVectorsForDoc;
// also publish a couple more common aliases just in case
export const setVectorsForDoc = saveVectorsForDoc;
export const putVectorsForDoc = saveVectorsForDoc;
export const upsertVectorsForDoc = saveVectorsForDoc;
export const getVectorsByDoc = getVectorsForDoc;
export const listVectorsForDoc = getVectorsForDoc;
export const getVectors = getVectorsForDoc;

/** Default export exposes everything too. */
const api = {
  saveVectorsForDoc,
  saveVectors,
  setVectorsForDoc,
  putVectorsForDoc,
  upsertVectorsForDoc,

  getVectorsForDoc,
  getVectorsByDocId,
  getVectorsByDoc,
  listVectorsForDoc,
  getVectors,

  hasVectorsForDoc,
  getAllVectors,
  deleteVectorsForDoc,
  listDocs,

  topK,
};
export default api;
