# Hallucination Guard — Evidence Aligner & Red-Flag Highlighter

Zero-cost, 100% client-side web app that reviews an LLM answer against local sources, highlights unsupported claims, and produces a grounded fix draft — all **in your browser**.

**Stack:** React + Vite, Tailwind CSS, shadcn/ui, Framer Motion, lucide-react, pdf.js, localForage (IndexedDB), Transformers.js (embeddings), optional WebLLM (on-device).  
**No backend. No paid APIs. Deployable on GitHub Pages.**

---

## ✨ Core Features

- **Sources ingest:** Upload PDFs (pdf.js) or paste text/Markdown → chunk (~1000 chars, 150 overlap) and store locally.
- **Embeddings & retrieval:** Compute embeddings in-browser (Transformers.js MiniLM-class), store vectors in IndexedDB, cosine top-k search.
- **Claim detection:** Heuristics for dates, numbers, entities, quoted titles, and simple noun phrases.
- **Evidence scoring:** Support / Unknown via overlap + similarity thresholds.
- **Red-flag highlighter:** Inline colored spans (supported green, unknown amber) with clickable citation chips `[C#]`.
- **Fix draft:** WebLLM rewrite if possible; otherwise safe **template-based** grounded rewrite (no hallucinations).
- **Report export:** Download JSON and copy Markdown; includes claim table, references, and rough before/after diff.
- **Privacy controls:** Storage meter + “Clear local data” wipes IndexedDB.

---

## 🚀 60-Second Quickstart

**Requirements:** Node.js 18+ (or 20+), a modern Chromium-based browser. WebGPU optional (for WebLLM path).

```bash
# 1) Install dependencies
npm install

# 2) Run dev server
npm run dev
# Open the printed Local URL (usually http://localhost:5173/)

Basic flow (in the app):

Sources tab → Upload a PDF or paste text → Ingest & Save

Click Compute Embeddings (first time may download a tiny model)

Review tab → Paste an LLM answer → Extract Claims

For some claims, click View evidence → see top chunks and scores

Fix Draft → Generate Fix Draft (WebLLM if available, else template)

📂 Project Structure

/
├─ index.html
├─ vite.config.ts
├─ postcss.config.js
├─ tailwind.config.js
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ styles.css
│  ├─ components/
│  │  ├─ PageShell.tsx
│  │  ├─ AnswerHighlighter.tsx
│  │  ├─ ClaimList.tsx
│  │  ├─ FixDraft.tsx
│  │  ├─ ReportView.tsx
│  │  ├─ StorageMeter.tsx
│  │  └─ ui/… (shadcn/ui primitives + toast/tabs/button/card/badge)
│  └─ lib/
│     ├─ pdf.ts             # pdf.js parsing
│     ├─ chunkText.ts       # chunking logic
│     ├─ embeddings.ts      # Transformers.js embedder
│     ├─ vectorStore.ts     # IndexedDB storage for vectors/chunks
│     ├─ claims.ts          # claim extraction heuristics
│     ├─ retrieval.ts       # top-k search + overlap
│     ├─ highlight.ts       # inline highlighter helpers
│     ├─ fix.ts             # WebLLM (optional) + template fallback
│     ├─ report.ts          # JSON + Markdown report builders
│     └─ diff.ts            # rough sentence-level diff
├─ docs/
│  ├─ architecture.md
│  └─ design.md
└─ .github/workflows/deploy.yml  # GitHub Pages workflow (optional)

🧠 How It Works (Pipeline)

Ingest → Chunk → Embed → Retrieve → Score → Highlight → Fix Draft → Report

Ingest PDFs/text → chunkText.ts

Embed chunks in browser → embeddings.ts (Transformers.js, MiniLM-class)

Save to IndexedDB (localForage) → vectorStore.ts

Retrieve top-k by cosine + overlap → retrieval.ts

Highlight answer spans with status chips → highlight.ts

Fix Draft via WebLLM if possible (Qwen2.5-0.5B) → else template rewrite → fix.ts

Report JSON/Markdown + rough diff → report.ts, diff.ts

More details will be in docs/architecture.md and docs/design.md.

🔒 Privacy & Offline

All sources, vectors, and app state live in IndexedDB in your browser.

Click Clear local data (Sources tab) to wipe.

WebLLM (optional) fetches small model files to your browser. No server calls.

🧰 Useful Commands
# Start dev server
npm run dev

# Production build
npm run build
# Preview local build
npm run preview

🌐 Deploy to GitHub Pages (Static)

If your repo name is hallucination-guard, your final URL will be:
https://<YOUR_GH_USERNAME>.github.io/hallucination-guard/

Set Vite base path in vite.config.ts to /<repo-name>/ (we’ll do this later).

Push to GitHub.

Use the provided GitHub Actions workflow to deploy.

🪙 Troubleshooting

Blank page on Pages → base path likely wrong (vite.config.ts).

404 for assets → same as above; hard refresh (Ctrl+Shift+R).

Embeddings error → allow the model CDN in your browser/privacy tools.

WebLLM not working → browser may not support WebGPU; template rewrite still works.

Quota exceeded → Ingest fewer pages or Clear local data.

📝 License

MIT

Report tab → Copy Markdown or Download JSON