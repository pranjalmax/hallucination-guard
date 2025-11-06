// src/components/PageShell.tsx
import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { motion } from "framer-motion";
import { useToast } from "./ui/use-toast";
import { chunkText, type Chunk } from "../lib/chunkText";
import {
  clearAll,
  deleteDocument,
  getChunksByDocId,
  listDocuments,
  newId,
  saveChunks,
  saveDocument,
  type DocRecord,
} from "../lib/storage";
import StorageMeter from "./StorageMeter";
import { parsePdfFile } from "../lib/pdf";

// Embeddings & vector store
import { loadEmbedder, embedMany, embedText } from "../lib/embeddings";
import {
  hasVectorsForDoc,
  saveVectorsForDoc,        // CHANGED: new API (docId, rows[])
  getVectorsForDoc,         // CHANGED: new API (docId) => VectorRecord[]
  deleteVectorsForDoc,
  type VectorRecord,
} from "../lib/vectorStore";

// Claims + retrieval
import { extractClaims, type Claim } from "../lib/claims";
import ClaimList from "./ClaimList";
import { retrieveEvidenceForClaim, type EvidenceItem } from "../lib/retrieval";

// New components
import AnswerHighlighter from "./AnswerHighlighter";
import FixDraft from "./FixDraft";
import ReportView from "./ReportView";

/** cosine similarity for Float32Array vectors */
function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i], y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

export default function PageShell() {
  const { push } = useToast();

  const [tab, setTab] = React.useState<"review" | "sources" | "report">("review");

  // Review state
  const [answerText, setAnswerText] = React.useState("");
  const [claims, setClaims] = React.useState<Claim[]>([]);
  const [claimStatuses, setClaimStatuses] = React.useState<
    Record<string, "supported" | "unknown" | "pending">
  >({});
  const [evidenceView, setEvidenceView] = React.useState<{ claim: Claim; items: EvidenceItem[] } | null>(null);
  const [evidenceByClaim, setEvidenceByClaim] = React.useState<Record<string, EvidenceItem[]>>({});
  const [viewing, setViewing] = React.useState(false);
  const [fixDraft, setFixDraft] = React.useState<string | undefined>(undefined);

  // ingest/persist
  const [rawText, setRawText] = React.useState("");
  const [ingesting, setIngesting] = React.useState(false);
  const [chunks, setChunks] = React.useState<Chunk[]>([]);
  const [docs, setDocs] = React.useState<DocRecord[]>([]);
  const [selectedDocId, setSelectedDocId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [storageRefreshKey, setStorageRefreshKey] = React.useState(0);
  const [pdfProgress, setPdfProgress] = React.useState<{ cur: number; total: number } | null>(null);

  // embeddings
  const [hasVectors, setHasVectors] = React.useState(false);
  const [embedStatus, setEmbedStatus] = React.useState<string>("");
  const [embeddingRunning, setEmbeddingRunning] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Array<VectorRecord & { score: number }>>([]);

  React.useEffect(() => {
    (async () => {
      const list = await listDocuments();
      setDocs(list);
      if (list.length) {
        const id = list[0].id;
        setSelectedDocId(id);
        const c = await getChunksByDocId(id);
        setChunks(c);
        setHasVectors(await hasVectorsForDoc(id));
      }
    })();
  }, []);

  function extractFromAnswer() {
    const out = extractClaims(answerText || "");
    setClaims(out);
    const statusMap: Record<string, "supported" | "unknown" | "pending"> = {};
    for (const c of out) statusMap[c.id] = "pending";
    setClaimStatuses(statusMap);
    setEvidenceView(null);
    setEvidenceByClaim({});
    setFixDraft(undefined);
    push({ title: "Claims extracted", description: `Found ${out.length} claim(s).` });
  }

  async function onViewEvidence(c: Claim) {
    if (!selectedDocId) {
      push({ title: "No document selected", description: "Select a document and compute embeddings in Sources." });
      return;
    }
    if (!hasVectors) {
      push({ title: "No embeddings", description: "In Sources, click 'Compute Embeddings'." });
      return;
    }
    try {
      setViewing(true);
      setEvidenceView(null);
      const res = await retrieveEvidenceForClaim(c.text, selectedDocId, 5);
      setEvidenceView({ claim: c, items: res.items });
      setClaimStatuses((m) => ({ ...m, [c.id]: res.status }));
      setEvidenceByClaim((m) => ({ ...m, [c.id]: res.items }));
      setFixDraft(undefined); // invalidate previous draft after new evidence
    } catch (err: any) {
      console.error(err);
      push({ title: "Evidence error", description: String(err?.message || err) });
    } finally {
      setViewing(false);
    }
  }

  function jumpToChunk(_claimId: string, chunkIdx: number) {
    setTab("sources");
    setTimeout(() => {
      const el = document.getElementById(`chunk-${chunkIdx}`);
      if (el) {
        el.classList.add("chunk-glow");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => el.classList.remove("chunk-glow"), 1400);
      }
    }, 120);
  }

  // ---------- Ingest + persistence ----------
  async function onPdfSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      push({ title: "Unsupported file", description: "Please choose a .pdf file." });
      return;
    }
    try {
      setPdfProgress({ cur: 0, total: 1 });
      const { text, pages } = await parsePdfFile(f, (cur, total) => setPdfProgress({ cur, total }));
      await ingestAndSave(text, "pdf", f.name);
      setPdfProgress(null);
      push({ title: "PDF ingested", description: `${pages} page(s) parsed and saved.` });
    } catch (err: any) {
      console.error(err);
      setPdfProgress(null);
      push({ title: "PDF error", description: String(err?.message || err) });
    } finally {
      (e.target as HTMLInputElement).value = "";
    }
  }

  async function ingestAndSave(text: string, source: DocRecord["sourceType"], title?: string) {
    const out = chunkText(text, 1000, 150);
    const id = newId("doc");
    const doc: DocRecord = {
      id,
      title: title || (source === "pasted" ? `Pasted source — ${new Date().toLocaleTimeString()}` : "Source"),
      sourceType: source,
      createdAt: Date.now(),
      bytes: new Blob([text]).size,
    };
    await saveDocument(doc);
    await saveChunks(id, out);
    const list = await listDocuments();
    setDocs(list);
    setSelectedDocId(id);
    setChunks(out);
    setStorageRefreshKey((k) => k + 1);
    setHasVectors(false);
    setResults([]);
  }

  async function handleIngest() {
    if (!rawText.trim()) {
      push({ title: "Nothing to ingest", description: "Paste some text first." });
      return;
    }
    setIngesting(true);
    await new Promise((r) => setTimeout(r, 200));
    await ingestAndSave(rawText, "pasted");
    setIngesting(false);
    push({ title: "Saved", description: `Text chunked and stored to IndexedDB.` });
  }

  async function onSelectDoc(id: string) {
    setSelectedDocId(id);
    const c = await getChunksByDocId(id);
    setChunks(c);
    setSearch("");
    setResults([]);
    setHasVectors(await hasVectorsForDoc(id));
  }

  async function onDeleteDoc(id: string) {
    await deleteDocument(id);
    await deleteVectorsForDoc(id);
    const list = await listDocuments();
    setDocs(list);
    setStorageRefreshKey((k) => k + 1);
    if (list.length) {
      const nextId = list[0].id;
      setSelectedDocId(nextId);
      const c = await getChunksByDocId(nextId);
      setChunks(c);
      setHasVectors(await hasVectorsForDoc(nextId));
    } else {
      setSelectedDocId(null);
      setChunks([]);
      setHasVectors(false);
    }
    setResults([]);
    push({ title: "Deleted", description: "Document removed." });
  }

  async function onClearAll() {
    await clearAll();
    setDocs([]); setSelectedDocId(null); setChunks([]); setHasVectors(false);
    setResults([]); setStorageRefreshKey((k) => k + 1);
    push({ title: "Cleared", description: "All local data wiped." });
  }

  const filtered = React.useMemo(() => {
    if (!search.trim()) return chunks;
    const q = search.toLowerCase();
    return chunks.filter((c) => c.text.toLowerCase().includes(q));
  }, [chunks, search]);

  const pdfPct =
    pdfProgress && pdfProgress.total > 0
      ? Math.round((pdfProgress.cur / pdfProgress.total) * 100)
      : 0;

  // ---------- Embeddings compute & search ----------
  async function computeEmbeddingsForSelected() {
    if (!selectedDocId) {
      push({ title: "No document selected", description: "Pick a document first." });
      return;
    }
    if (chunks.length === 0) {
      push({ title: "No chunks", description: "Ingest a source for this document." });
      return;
    }
    try {
      setEmbeddingRunning(true);
      setResults([]);
      setEmbedStatus("Loading model… (first run may download files)");
      await loadEmbedder((p) => {
        if (p?.status === "initiate") setEmbedStatus("Preparing model…");
        if (p?.status === "progress") {
          const pct = p?.progress ? Math.round(p.progress * 100) : 0;
          setEmbedStatus(`Downloading model… ${pct}%`);
        }
        if (p?.status === "done") setEmbedStatus("Model ready.");
      });

      const MAX_FOR_TEST = 120;
      const texts = chunks.map((c) => c.text);
      const tooMany = texts.length > MAX_FOR_TEST;
      const batch = tooMany ? texts.slice(0, MAX_FOR_TEST) : texts;

      let lastPct = 0;
      setEmbedStatus(
        `Embedding ${batch.length}${tooMany ? ` of ${texts.length}` : ""} chunks… 0%`
      );
      const vecs = await embedMany(batch, (i, total) => {
        const pct = Math.round((i / total) * 100);
        if (pct !== lastPct) {
          lastPct = pct;
          setEmbedStatus(
            `Embedding ${batch.length}${tooMany ? ` of ${texts.length}` : ""} chunks… ${pct}%`
          );
        }
      });

      // CHANGED: saveVectorsForDoc(docId, rows[])
      const rows = chunks.slice(0, batch.length).map((c, i) => ({
        id: `${selectedDocId}:${c.idx}`,
        docId: selectedDocId!,
        idx: c.idx,
        text: c.text,
        page: (c as any).page,
        start: c.start,
        end: c.end,
        vector: vecs[i], // Float32Array is fine; vectorStore serializes to number[]
      }));
      await saveVectorsForDoc(selectedDocId, rows);

      setHasVectors(true);
      setEmbedStatus(
        tooMany
          ? `Done subset (${batch.length}/${texts.length}). Reclick to continue or raise limit.`
          : "Done. Vectors saved."
      );
      setStorageRefreshKey((k) => k + 1);
      push({ title: "Embeddings saved", description: `Stored ${vecs.length} vectors.` });
    } catch (err: any) {
      console.error(err);
      setEmbedStatus(String(err?.message || err));
      push({ title: "Embedding error", description: String(err?.message || err) });
    } finally {
      setEmbeddingRunning(false);
    }
  }

  async function runSemanticSearch() {
    if (!selectedDocId) return;
    if (!hasVectors) {
      push({ title: "No embeddings", description: "Compute embeddings first." });
      return;
    }
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setEmbedStatus("Embedding query…");
    const qvec = await embedText(query);

    const items = await getVectorsForDoc(selectedDocId);
    const scored: Array<VectorRecord & { score: number }> = items.map((it) => {
      const v = it.vector instanceof Float32Array ? it.vector : new Float32Array(it.vector as any);
      const score = cosine(qvec, v);
      return { ...it, score };
    });
    scored.sort((a, b) => b.score - a.score);
    setResults(scored.slice(0, 5));
    setEmbedStatus("Query done.");
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20">
      {/* Hero */}
      <section className="mt-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-3xl sm:text-4xl font-semibold text-white">
            Guard your answers. <span className="text-accentCyan">Align evidence.</span>
          </h1>
          <p className="text-muted mt-2">
            Paste a model answer and upload/paste sources. We’ll flag unsupported claims and draft grounded fixes — all in your browser.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Badge intent="success">Zero Cost</Badge>
            <Badge intent="info">Client-Side Only</Badge>
            <Badge intent="warn">No Backend</Badge>
          </div>
        </motion.div>
      </section>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <div className="flex items-center justify-center">
          <TabsList>
            <TabsTrigger value="review">Review</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="report">Report</TabsTrigger>
          </TabsList>
        </div>

        {/* REVIEW */}
        <TabsContent value="review">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Left: editor + highlights */}
            <Card>
              <CardHeader><CardTitle>Answer Editor</CardTitle></CardHeader>
              <CardContent>
                <textarea
                  className="w-full min-h-[160px] rounded-xl bg-black/30 border border-white/10 p-3 text-sm"
                  placeholder="Paste any LLM answer here..."
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                />
                <div className="mt-3 flex items-center gap-2">
                  <Button onClick={extractFromAnswer}>Extract Claims</Button>
                  <span className="text-xs text-muted">
                    {answerText.length ? `${answerText.length} chars` : "paste some text"}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs">
                  <span className="inline-block h-3 w-3 rounded-full bg-[#34D399] shadow-[0_0_10px_rgba(52,211,153,0.5)]" /> Supported
                  <span className="inline-block h-3 w-3 rounded-full bg-[#F59E0B] shadow-[0_0_10px_rgba(245,158,11,0.45)]" /> Unknown/Pending
                </div>
                <div className="mt-3 rounded-xl bg-black/25 border border-white/10 p-3 min-h-[120px]">
                  <AnswerHighlighter
                    text={answerText}
                    claims={claims}
                    statuses={claimStatuses}
                    evidenceByClaim={evidenceByClaim}
                    onJump={jumpToChunk}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Right: claim list + evidence + fix draft */}
            <Card>
              <CardHeader><CardTitle>Claims & Evidence</CardTitle></CardHeader>
              <CardContent>
                <ClaimList claims={claims} statuses={claimStatuses} onView={onViewEvidence} />
                {evidenceView && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge intent={claimStatuses[evidenceView.claim.id] === "supported" ? "success" : "warn"}>
                        {claimStatuses[evidenceView.claim.id]}
                      </Badge>
                      <div className="text-xs text-muted">Evidence for:</div>
                    </div>
                    <div className="text-sm leading-relaxed mb-3">
                      {evidenceView.claim.text.length > 400 ? evidenceView.claim.text.slice(0, 400) + "…" : evidenceView.claim.text}
                    </div>
                    <div className="space-y-2 max-h-[220px] overflow-auto pr-1">
                      {evidenceView.items.map((it) => (
                        <div key={it.idx} className="rounded-lg border border-white/10 bg-black/30 p-3">
                          <div className="text-xs text-muted mb-1">
                            Chunk {it.idx} · sim {it.score.toFixed(3)} · overlap {it.overlap.toFixed(2)}
                          </div>
                          <div className="text-sm leading-relaxed">
                            {it.text.length > 360 ? it.text.slice(0, 360) + "…" : it.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {viewing && <div className="mt-2 text-xs text-muted">Retrieving evidence…</div>}
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="mb-2">
                    <h3 className="text-sm font-semibold">Fix Draft</h3>
                    <div className="text-xs text-muted">Produce a grounded revision (WebLLM if available; otherwise template).</div>
                  </div>
                  <FixDraft
                    answer={answerText}
                    claims={claims}
                    statuses={claimStatuses}
                    evidenceByClaim={evidenceByClaim}
                    onDraftReady={(t) => setFixDraft(t)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SOURCES */}
        <TabsContent value="sources">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Left: ingest */}
            <Card>
              <CardHeader>
                <CardTitle>Upload / Ingest (text & PDF; persisted)</CardTitle>
              </CardHeader>
              <CardContent>
                <label className="block text-xs text-muted mb-1">Upload PDF:</label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={onPdfSelect}
                  className="block w-full text-sm file:mr-3 file:rounded-full file:border file:border-border file:bg-white/5 file:px-3 file:py-1.5 file:text-white hover:file:bg-white/10"
                  aria-label="Choose a PDF"
                />
                {pdfProgress && (
                  <div className="mt-2">
                    <div className="text-xs text-muted">
                      Parsing PDF: page {pdfProgress.cur} / {pdfProgress.total} ({pdfPct}%)
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-black/30 overflow-hidden">
                      <div
                        className="h-full bg-accentViolet"
                        style={{ width: `${pdfPct}%`, boxShadow: "0 0 12px rgba(139,92,246,.45)" }}
                      />
                    </div>
                  </div>
                )}

                <label htmlFor="paste" className="block mt-4 text-xs text-muted">Or paste text:</label>
                <textarea
                  id="paste"
                  className="mt-1 w-full min-h-[140px] rounded-xl bg-black/30 border border-white/10 p-3 text-sm"
                  placeholder="Paste any source text here."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                />

                <div className="mt-3 flex items-center gap-2">
                  <Button onClick={handleIngest} disabled={ingesting}>
                    {ingesting ? "Saving..." : "Ingest & Save"}
                  </Button>
                  <Button variant="outline" onClick={onClearAll}>Clear local data</Button>
                </div>

                <StorageMeter refreshKey={storageRefreshKey} />
              </CardContent>
            </Card>

            {/* Right: docs + chunks + embeddings */}
            <Card>
              <CardHeader>
                <CardTitle>Documents, Embeddings & Semantic Search</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <select
                    className="w-full rounded-full bg-black/30 border border-white/10 px-3 py-2 text-sm"
                    value={selectedDocId ?? ""}
                    onChange={(e) => onSelectDoc(e.target.value)}
                  >
                    {!docs.length && <option value="">No documents yet</option>}
                    {docs.map((d) => (
                      <option key={d.id} value={d.id}>{d.title}</option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    disabled={!selectedDocId}
                    onClick={() => selectedDocId && onDeleteDoc(selectedDocId)}
                    title="Delete selected document"
                  >
                    Delete
                  </Button>
                </div>

                <input
                  type="text"
                  className="mt-3 w-full rounded-full bg-black/30 border border-white/10 px-3 py-2 text-sm"
                  placeholder="Search chunks (keyword)…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <div className="mt-3 max-h-[220px] overflow-auto space-y-2 pr-1">
                  {(!selectedDocId || chunks.length === 0) && (
                    <div className="text-muted text-sm">
                      No chunks for this document — ingest a PDF or paste text.
                    </div>
                  )}
                  {filtered.map((c) => (
                    <div
                      key={c.idx}
                      id={`chunk-${c.idx}`}
                      className="rounded-lg border border-white/10 bg-white/5 p-3"
                    >
                      <div className="text-xs text-muted mb-1">
                        Chunk {c.idx} · chars {c.start}–{c.end}
                      </div>
                      <div className="text-sm leading-relaxed">
                        {c.text.length > 300 ? c.text.slice(0, 300) + "…" : c.text}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-muted">
                    Embeddings status: <span className="text-white">{hasVectors ? "ready" : "not computed"}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      onClick={computeEmbeddingsForSelected}
                      disabled={embeddingRunning || !selectedDocId || chunks.length === 0}
                    >
                      {hasVectors
                        ? embeddingRunning ? "Recomputing…" : "Recompute Embeddings"
                        : embeddingRunning ? "Computing…" : "Compute Embeddings"}
                    </Button>
                    <span className="text-xs text-muted">{embedStatus}</span>
                  </div>

                  <div className="mt-3">
                    <div className="text-xs text-muted mb-1">Semantic Search (over selected doc)</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="w-full rounded-full bg-black/30 border border-white/10 px-3 py-2 text-sm"
                        placeholder="e.g., 'eligibility requirements' or 'model accuracy metric'"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && runSemanticSearch()}
                      />
                      <Button onClick={runSemanticSearch}>Search</Button>
                    </div>
                    {results.length > 0 && (
                      <div className="mt-2 max-h-[200px] overflow-auto space-y-2 pr-1">
                        {results.map((r) => (
                          <div key={r.idx} className="rounded-lg border border-white/10 bg-white/5 p-3">
                            <div className="text-xs text-muted mb-1">
                              Match {r.idx} · score {r.score.toFixed(3)}
                            </div>
                            <div className="text-sm leading-relaxed">
                              {r.text.length > 350 ? r.text.slice(0, 350) + "…" : r.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* REPORT */}
        <TabsContent value="report">
          <ReportView
            answer={answerText}
            draft={fixDraft}
            claims={claims}
            statuses={claimStatuses}
            evidenceByClaim={evidenceByClaim}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
