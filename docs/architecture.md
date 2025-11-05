# Architecture — Hallucination Guard

Zero-cost, client-side verification of LLM answers against local sources.  
Runs fully in the browser (IndexedDB for storage, optional on-device WebLLM).

---

## High-Level Flow

User
│
▼
Review UI (paste answer) ───► Claim Extraction (heuristics)
│
│ Sources UI (upload/paste)
│ └─► Chunk (~1000 / 150 overlap)
│ │
│ └─► Store in IndexedDB (localForage)
│ │
│ ▼
│ Embeddings (Transformers.js)
│ │
│ Vector Store (IndexedDB)
│ │
▼ ▼
Retrieval (cosine top-k + overlap scoring)
│
┌─────────────────┴─────────────────┐
│ │
Evidence Panel Inline Highlighter
(per-claim top chunks) (supported/unknown spans + [C#] chips)
│ │
└─────────────────┬─────────────────┘
▼
Fix Draft
(WebLLM if available; else template)
│
▼
Report
(JSON + Markdown + rough diff preview)


---

## Modules (where the logic lives)

- **`src/lib/pdf.ts`** — Wraps **pdf.js** to parse PDFs client-side with a progress callback.
- **`src/lib/chunkText.ts`** — Splits text into ~1000-char chunks with ~150 overlap (configurable).
- **`src/lib/embeddings.ts`** — Loads a tiny **Transformers.js** text-embedding model, exposes:
  - `loadEmbedder(onProgress?)`, `embedText(text)`, `embedMany(texts, onBatchProgress?)`.
- **`src/lib/vectorStore.ts`** — IndexedDB (via **localForage**) for:
  - saving chunk vectors and metadata, fetching by `docId`, cosine `topK`.
- **`src/lib/claims.ts`** — Heuristic claim extraction (dates, numbers, entities, quoted titles, simple NPs).
- **`src/lib/retrieval.ts`** — Given a claim:
  - embed claim → cosine top-k over selected doc → compute token/keyword overlap → status (`supported`/`unknown`) + evidence list.
- **`src/lib/highlight.ts`** — Maps claim spans to inline highlights (green = supported, amber = unknown) + clickable citation chips `[C#]`.
- **`src/lib/fix.ts`** — Grounded rewrite:
  - try **WebLLM** (small model) if available; fallback to template replacement using retrieved snippets.
- **`src/lib/report.ts`** — Builds **Report JSON** + **Markdown** (claim table, refs, summaries).
- **`src/lib/diff.ts`** — Very rough sentence-level diff for “Before/After”.

UI composition (selected):
- **`src/components/PageShell.tsx`** — Tabs (Review / Sources / Report) and orchestration.
- **`src/components/ClaimList.tsx`** — Per-claim status + “View evidence”.
- **`src/components/AnswerHighlighter.tsx`** — Inline spans + citation chips.
- **`src/components/FixDraft.tsx`** — Draft generator (WebLLM toggle + template fallback).
- **`src/components/ReportView.tsx`** — Claim table, dashboard bar, diff, refs, copy/download.

---

## Data Model (simplified)

```ts
// Document metadata
type DocRecord = {
  id: string;                 // "doc_xxx"
  title: string;              // file name or pasted title
  sourceType: "pdf" | "pasted";
  createdAt: number;          // Date.now()
  bytes: number;              // approximate size
};

// Chunked text
type Chunk = {
  docId: string;              // foreign key to DocRecord.id
  idx: number;                // 0..N-1
  start: number;              // char start offset (original text)
  end: number;                // char end offset
  text: string;               // chunk content
};

// Vector store record
type VectorRecord = {
  docId: string;
  idx: number;                // matches Chunk.idx
  text: string;               // duplicated for convenient previews
  vector: Float32Array;       // embedding
};


All persisted in IndexedDB via localForage.

Retrieval & Scoring (simple & fast)

Embed claim text (Transformers.js tiny model).

Cosine top-k over vectors for the selected document.

Overlap heuristic (normalized keyword/NP overlap) to decide:

supported (above threshold) vs unknown (below threshold).

Store per-claim evidence list (top chunks + scores) in memory (not persisted by default).

This is intentionally lightweight to run on typical laptops without a backend.

Fix Draft Strategy

Try WebLLM (small model) if the browser supports WebGPU and assets load.

If not available, use a template-based rewrite:

Keep supported statements as-is (plus citations).

Replace unknown spans with inlined quotations from top evidence chunks or mark with TODO where evidence is ambiguous.

Privacy & Offline

No servers. No paid APIs.

All sources, vectors, and app state live in IndexedDB.

Clear local data wipes everything.

WebLLM (optional) downloads small weights to the browser cache only.

Error Handling (typical cases)

PDF parse error → show toast + keep app usable; paste-text path still works.

Embedding model fetch blocked → show progress message; app still functions (you can highlight via claim heuristics and template fix).

Quota exceeded → prompt to clear data or ingest fewer pages.

GitHub Pages base path misconfigured → 404s on assets; fix vite.config.ts: base.