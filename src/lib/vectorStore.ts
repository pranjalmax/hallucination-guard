// src/lib/vectorStore.ts
// Robust vector store for IndexedDB (localForage).
// Exposes multiple API names (named + default export) so callers are never missing a function.

import localforage from "localforage";

type RowStored = {
  id: string;           // stable row id
  docId: string;        // document id
  idx: number;          // chunk index within doc
  text: string;         // chunk text
  page?: number;
  start?: number;
  end?: number;
  vector: number[];     // stored as number[] for IndexedDB safety
};

type RowOut = Omit<RowStored, "vector"> & { vector: Float32Array };

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
  const vec = r.vector instanceof Float32Array ? Array.from(r.vector as Float32Array) : (r.vector ?? []);
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
function toOut(r: RowStored): RowOut {
  return { ...r, vector: new Float32Array(r.vector) };
}

/** Save or replace all vectors for a document. */
export async function saveVectorsForDoc(docId: string, rows: any[]): Promise<void> {
  const key = `doc:${docId}`;
  const stored = (rows || []).map((r, i) => toStored(docId, { idx: i, ...r }));
  await VEC.setItem(key, stored);
  await META.setItem(`meta:${docId}`, { id: docId, count: stored.length, ts: Date.now() });
}

/** Return vectors for one document (as Float32Array). */
export async function getVectorsForDoc(docId: string): Promise<RowOut[]> {
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
export async function getAllVectors(): Promise<RowOut[]> {
  const out: RowOut[] = [];
  await VEC.iterate<RowStored[], void>((value, key) => {
    if (!key.startsWith("doc:")) return;
    const docId = key.slice(4);
    for (const r of value || []) out.push(toOut({ ...r, docId }));
  });
  return out;
}

/* -----------------------------
   Synonyms (so callers never break)
   ----------------------------- */
export const setVectorsForDoc = saveVectorsForDoc;
export const putVectorsForDoc = saveVectorsForDoc;
export const upsertVectorsForDoc = saveVectorsForDoc;

export const getVectorsByDoc = getVectorsForDoc;
export const listVectorsForDoc = getVectorsForDoc;
export const getVectors = getVectorsForDoc;

/** Default export exposes all names too. */
const api = {
  saveVectorsForDoc,
  setVectorsForDoc,
  putVectorsForDoc,
  upsertVectorsForDoc,
  getVectorsForDoc,
  getVectorsByDoc,
  listVectorsForDoc,
  getVectors,
  getAllVectors,
  deleteVectorsForDoc,
  listDocs,
};
export default api;
