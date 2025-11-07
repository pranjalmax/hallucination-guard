# Hallucination Guard — Architecture

This doc explains **how the app works under the hood** in a way that’s friendly to:
- engineers reviewing the codebase
- hiring managers evaluating design & implementation skills

The core idea:

> **Everything runs in the browser.**  
> We take user sources → build a local vector index → extract claims → retrieve evidence → score + highlight — with no backend.

---

## High-Level Flow

### 1. Ingest

**User actions**

- Upload PDF(s), or
- Paste text / Markdown.

**What happens**

1. PDFs are parsed client-side via **pdf.js**.
2. Raw text is passed into `chunkText.ts`.
3. `chunkText.ts` splits into overlapping chunks (~800–1000 chars, 150 overlap).
4. `storage.ts` saves:
   - a `DocRecord` (id, title, sourceType, createdAt, size)
   - its chunks `{ docId, idx, text, start, end }`
5. Data is persisted in **IndexedDB** via `localForage`.

**Why this matters**

- Respect data privacy: no upload to any server.
- Creates a consistent structure for retrieval.

---

### 2. Embeddings & Vector Store

**User actions**

- Select a document.
- Click **“Compute Embeddings”**.

**What happens**

1. `embeddings.ts`:
   - loads a tiny **Transformers.js** model (MiniLM-style) in the browser,
   - exposes `embedMany(texts)` and `embedText(text)`.

2. `vectorStore.ts`:
   - stores vectors next to chunk metadata in IndexedDB:
     ```ts
     {
       docId,
       idx,
       text,
       vector: Float32Array | number[]
     }
     ```
   - provides:
     - `saveVectors(docId, chunks, vectors)`
     - `getVectorsByDocId(docId)`
     - `hasVectorsForDoc(docId)`
     - `deleteVectorsForDoc(docId)`

**Why this matters**

- Demonstrates **on-device retrieval**: no OpenAI / no cloud embedding service.
- Clean separation between:
  - “how we embed” and
  - “how/where we store vectors”.

---

### 3. Claim Extraction

**User actions**

- Paste an LLM answer in **Review**.
- Click **“Extract Claims”**.

**What happens**

1. `claims.ts` scans the answer and emits `Claim` objects:
   - Uses regex + simple heuristics to detect:
     - dates (e.g. “February 2023”),
     - numbers,
     - named entities / capitalized spans,
     - quoted titles/snippets.
   - Keeps enough text to be meaningful (phrase-level, not single-word if possible).
2. Claims are displayed in `ClaimList` and highlighted in `AnswerHighlighter`.

**Why this matters**

- Shows ability to implement **lightweight NLP** without heavy models.
- Keeps implementation transparent & editable for users.

---

### 4. Evidence Retrieval & Scoring

**User actions**

- For a given claim, click **“View evidence”**.

**What happens**

1. `retrieval.ts`:
   - Calls `embedText(claim.text)` to get a query vector.
   - Fetches all vectors for the selected doc via `vectorStore.ts`.
   - Computes cosine similarity and takes top-k candidates.
   - For each candidate, calls `scoreEvidence` from `scoring.ts`.

2. `scoring.ts`:
   - Normalizes tokens & removes stopwords.
   - Computes lexical overlap between claim & chunk.
   - Extracts months/years from both sides.
   - Heuristics:
     - If strong overlap **and** dates align → `supported`.
     - If strong overlap but months/years clearly disagree (e.g. February vs March) → `contradiction`.
     - Otherwise → `unknown`.

3. `retrieveEvidenceForClaim` aggregates:
   - a list of `EvidenceItem`:
     ```ts
     {
       idx,
       text,
       score,    // cosine similarity
       overlap,  // lexical support
       label     // supported | contradiction | unknown
     }
     ```
   - an overall claim status for the UI:
     - `supported` if we saw good support and no contradiction.
     - `unknown` if conflicting or weak.

**Why this matters**

- Shows understanding of **retrieval-augmented verification**.
- Explicitly encodes **safety: contradictions never marked as supported**.
- All logic is readable TypeScript — no black box.

---

### 5. Highlighting & UX

**Components**

- `PageShell.tsx`
  - Orchestrates state across tabs.
  - Connects ingest, embeddings, claims, evidence, and reports.
- `AnswerHighlighter.tsx`
  - Uses claim spans + status to highlight:
    - supported → green glass.
    - unknown → amber.
  - Clickable citation chips can jump to chunks.
- `ClaimList.tsx`
  - Shows per-claim status + type (DATE / NUMBER / ENTITY / QUOTED).
- `FixDraft.tsx`
  - Builds a grounded revision:
    - If a small on-device model is available, can be plugged in.
    - Otherwise uses a conservative template-based rewrite.
- `ReportView.tsx`
  - Renders:
    - claim table,
    - factuality bar,
    - rough diff,
    - Markdown + JSON export.

**Why this matters**

- Demonstrates **component architecture**, not a monolith.
- Clear separation between logic (`lib/`) and UI (`components/`).

---

## Visual & Interaction Stack

- **React + Vite + TypeScript** — fast local dev, static build for GitHub Pages.
- **Tailwind CSS** — design tokens for dark AI theme.
- **shadcn/ui** — composable primitives (Button, Card, Tabs, Dialog, etc.).
- **Framer Motion** — micro-animations (card entrance, hover, toasts).
- **lucide-react** — crisp iconography.
- **localForage + IndexedDB** — async, persistent storage layer.

The aesthetic choices (gradient mesh, glass cards, neon accents) are implemented in a small number of shared components (`GradientBG`, `NavBar`, layout wrappers) so the rest of the app stays clean.

---

## Deployment Architecture

- Static build via `vite build`.
- **GitHub Actions** workflow:
  - on push to `main`:
    - install deps,
    - run TypeScript build,
    - deploy `dist` to `gh-pages`.
- Hosted on **GitHub Pages**. No runtime server cost.

**Why this matters**

- Shows comfort with **CI/CD** and “zero-cost” hosting.
- Reinforces the privacy story: the deployed artifact is just static files.

---

## Design Principles (what this says about my approach)

1. **Client-first & privacy-first**
   - Everything critical runs locally; easy to reason about data flow.

2. **Explainability**
   - Visible chunks, scores, and citations instead of magic “truth scores”.

3. **Modularity**
   - `lib/` for logic, `components/` for UI — easy to swap models or scoring.

4. **Realistic constraints**
   - No assumption of expensive infra or secret keys.
   - Targets a normal laptop browser.

5. **Recruiter-readable**
   - The codebase is documented, typed, and intentionally approachable.

If you’d like a deeper dive into styling and motion decisions, see [`docs/design.md`](./design.md).
