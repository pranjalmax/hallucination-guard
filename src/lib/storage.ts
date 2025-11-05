// src/lib/storage.ts
import localforage from "localforage";
import type { Chunk } from "./chunkText";

/** Document metadata stored in IndexedDB */
export type DocRecord = {
  id: string;
  title: string;                 // e.g., "Pasted source — 13:47:02" or file name
    sourceType: "pasted" | "file" | "pdf";
  createdAt: number;             // Date.now()
  bytes?: number;                // rough size of original text
};

const docsStore = localforage.createInstance({
  name: "hg",
  storeName: "docs",
});

const chunksStore = localforage.createInstance({
  name: "hg",
  storeName: "chunks",
});

/** Small helper to generate IDs */
export function newId(prefix = "doc"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Save/replace a document record */
export async function saveDocument(doc: DocRecord): Promise<void> {
  await docsStore.setItem(doc.id, doc);
}

/** List all documents (most recent first) */
export async function listDocuments(): Promise<DocRecord[]> {
  const out: DocRecord[] = [];
  await docsStore.iterate<DocRecord, void>((value) => {
    out.push(value);
  });
  // newest first
  out.sort((a, b) => b.createdAt - a.createdAt);
  return out;
}

/** Remove a single document + its chunks */
export async function deleteDocument(docId: string): Promise<void> {
  await docsStore.removeItem(docId);
  const keys = await chunksStore.keys();
  const toDelete = keys.filter((k) => k.startsWith(docId + ":"));
  await Promise.all(toDelete.map((k) => chunksStore.removeItem(k)));
}

/** Clear everything */
export async function clearAll(): Promise<void> {
  await Promise.all([docsStore.clear(), chunksStore.clear()]);
}

/** Store chunks for a given doc (keys are `${docId}:${idx}`) */
export async function saveChunks(docId: string, chunks: Chunk[]): Promise<void> {
  await Promise.all(
    chunks.map((c) =>
      chunksStore.setItem(`${docId}:${c.idx}`, {
        docId,
        idx: c.idx,
        start: c.start,
        end: c.end,
        text: c.text,
      })
    )
  );
}

/** Get chunks for a doc, ordered by idx */
export async function getChunksByDocId(docId: string): Promise<Chunk[]> {
  const keys = await chunksStore.keys();
  const mine = keys.filter((k) => k.startsWith(docId + ":"));
  mine.sort((a, b) => {
    const ai = parseInt(a.split(":")[1] || "0", 10);
    const bi = parseInt(b.split(":")[1] || "0", 10);
    return ai - bi;
  });

  const out: Chunk[] = [];
  for (const k of mine) {
    const v = (await chunksStore.getItem(k)) as any;
    if (v) out.push({ idx: v.idx, start: v.start, end: v.end, text: v.text });
  }
  return out;
}

/** Storage usage helper (uses browser estimate API) */
export async function getStorageEstimate() {
  if (navigator.storage && navigator.storage.estimate) {
    const est = await navigator.storage.estimate();
    // Some browsers only fill quota; provide safe defaults
    const used = est.usage ?? 0;
    const quota = est.quota ?? 0;
    return { used, quota };
  }
  // Fallback: try to approximate via key sizes (rough)
  let used = 0;
  const addSize = (o: any) => {
    try {
      used += new Blob([JSON.stringify(o)]).size;
    } catch {
      // ignore
    }
  };
  await docsStore.iterate((v) => addSize(v));
  await chunksStore.iterate((v) => addSize(v));
  // Assume 50MB quota fallback
  return { used, quota: 50 * 1024 * 1024 };
}
