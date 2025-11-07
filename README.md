# Hallucination Guard — Evidence Aligner & Red-Flag Highlighter

**Live demo:** https://pranjalmax.github.io/hallucination-guard/  
**Repo:** https://github.com/pranjalmax/hallucination-guard

> Paste an LLM answer → ingest sources → get inline highlights, evidence links, and a grounded fix draft.  
> 100% client-side. Zero cost. Built as a practical hallucination guardrail demo.

---

## Demo

![Hallucination Guard demo](docs/demo.gif)

*(Short: ingest → embeddings → extract claims → view evidence → report.)*

---

## Why this project exists (for reviewers & recruiters)

Modern LLMs are powerful but **hallucinate facts**. Many teams want:

- A lightweight way to **check answers against their own documents**.
- **No backend**, no data leaving the browser.
- Something they can understand, tweak, and trust.

I built **Hallucination Guard** to demonstrate that:

1. You can do **retrieval + basic claim checking entirely in the browser**.
2. You can wrap that in a **real product experience**, not just a demo script.
3. I can own the full stack: **UX → frontend architecture → on-device ML → infra (CI/CD)**.

If you’re reading this as a hiring manager: this repo is meant to be a clear, production-style sample of how I design & ship an AI tool under real constraints.

---

## What this showcases about my skills

**Product & UX**

- Turned “hallucination guard” into a clear, guided flow (Sources → Review → Report).
- Strong focus on **explainability & trust**: visible sources, citations, diff, and privacy controls.
- Dark, modern **“AI tool” aesthetic** with gradients, glassmorphism, micro-animations.

**Frontend Engineering**

- React + Vite + TypeScript SPA, deployable as static assets (GitHub Pages).
- Tailwind CSS + shadcn/ui + Framer Motion + lucide icons.
- Modular, typed components: `PageShell`, `ClaimList`, `FixDraft`, `ReportView`, etc.
- Accessibility: focus states, keyboard-friendly controls, clear affordances.

**AI / Retrieval Engineering**

- Local embeddings via **Transformers.js** (MiniLM), run in the browser.
- Simple **vector store on IndexedDB** with metadata, top-k retrieval.
- Claim extraction using **regex + noun-phrase heuristics**, tuned for factual claims.
- Evidence scoring with:
  - lexical overlap,
  - date/number checks,
  - basic contradiction detection (e.g., February vs March).

**Systems & Constraints**

- 100% **client-side**, no paid APIs, no servers.
- Uses **localForage + IndexedDB** for persistence; storage usage surfaced to user.
- **GitHub Actions** workflow builds + deploys automatically to GitHub Pages.

---

## Core Features

### 1. Sources Tab — “Ground truth” ingest

- Upload PDFs (parsed via `pdf.js`) or paste plain text/Markdown.
- Text is chunked (~800–1000 chars with overlap).
- Chunks & document metadata stored in IndexedDB.
- Storage meter + **Clear local data** button for privacy.

### 2. Embeddings & Semantic Search

- Per-document embeddings computed in-browser with Transformers.js.
- Vectors stored alongside chunks in IndexedDB.
- Semantic search UI to sanity-check retrieval.

### 3. Review Tab — Claims & Red Flags

- Paste any LLM answer.
- **Extract Claims**:
  - Finds numbers, dates, entities, and short phrases as candidate factual claims.
- For each claim:
  - Retrieves top-k evidence chunks from the selected source doc.
  - Scores them:
    - `supported` if strong overlap, no conflicting dates.
    - `unknown` if weak/mixed / conflicting signals.
    - Internal contradiction detection (e.g., February vs March) feeds into `unknown`.
- Inline highlighting:
  - Supported spans: **green glow**.
  - Uncertain spans: **amber**.
- “View evidence” shows matching chunks with scores & overlap.

### 4. Fix Draft & Report Tab

- **Fix Draft**:
  - Uses retrieved evidence to propose a grounded revision.
  - If a local small model is available, it can be plugged in.
  - Otherwise, uses a template-based conservative rewrite.
- **Report**:
  - Claim table (Claim, Status, Citations).
  - Mini “Factuality” bar.
  - Before/After diff-style summary.
  - **Copy Markdown** (for PRs / docs).
  - **Download JSON** for programmatic use.

### 5. Privacy & Safety

- All data stays in the browser (no network calls for content).
- User can wipe everything with one click.
- No secret keys, no tracking, no external APIs for inference.

---

## How it works (high-level)

1. **Ingest**
   - PDF/text → `chunkText` → `storage` (IndexedDB).

2. **Embed**
   - `embeddings.ts` loads a tiny model via Transformers.js.
   - `vectorStore.ts` persists `{ docId, chunkIdx, text, vector }`.

3. **Extract claims**
   - `claims.ts` scans the answer:
     - regexes for numbers/dates/quotes,
     - simple proper-noun / phrase windows.
   - Produces phrase-level “claims” with spans.

4. **Retrieve & score**
   - `retrieval.ts`:
     - embeds claim,
     - retrieves nearest chunks,
     - calls `scoreEvidence` from `scoring.ts`.
   - `scoring.ts`:
     - lexical overlap,
     - month/year checks to avoid endorsing obviously wrong dates.

5. **Highlight & report**
   - `AnswerHighlighter` colors spans based on status.
   - `ReportView` compiles claims, evidence, and a suggested fix.

A diagram version of this lives in [`docs/architecture.md`](docs/architecture.md).

---

## Tech Stack

**Core**

- React + Vite + TypeScript
- Tailwind CSS
- shadcn/ui components
- Framer Motion
- lucide-react icons

**AI / Data**

- Transformers.js (browser embeddings; MiniLM-style model)
- pdf.js (PDF extraction)
- localForage + IndexedDB (storage)

**Tooling**

- GitHub Actions (build + deploy)
- GitHub Pages (static hosting)

---

## Getting Started (local)

```bash
git clone https://github.com/pranjalmax/hallucination-guard.git
cd hallucination-guard
npm install
npm run dev

Then open the printed localhost URL.

Build:
npm run build 
```
---

## Privacy & Limitations

**Privacy**
All processing happens in your browser.
No content is sent to any server.
Use “Clear local data” to wipe IndexedDB.
**Limitations**
Claim extraction is heuristic, not a full parser.
Evidence scoring is intentionally conservative & simple.
Not a formal fact-checker; it’s a practical assistive tool / demo.
Web-embeddings model download can be a few MB on first run.

---

## Notes for Hiring Managers

If you’re evaluating my work, this repo is meant to show:
I can design, implement, and ship an end-to-end AI feature, not just call an API.
I understand retrieval, embeddings, and scoring heuristics, and can explain them.
I care about UX, clarity, and safety, not just “it runs”.
I can work within hard constraints (no backend, no paid APIs, privacy-first) and still deliver a polished experience.
If you’d like a walkthrough of how I’d evolve this into a production-grade guardrail for your stack, I’m happy to explain.

---

## License
MIT