// src/lib/embeddings.ts
import { pipeline, env } from "@xenova/transformers";

/**
 * Keep everything client-side and fetch models/wasm from CDNs.
 * If your browser blocks 3rd-party CDNs, allow jsDelivr / HuggingFace.
 */
env.allowLocalModels = false;
env.useBrowserCache = true; // reuse downloaded files between runs
// Optional explicit path for ONNX WASM assets (usually auto-works without this):
// env.backends.onnx.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/@xenova/transformers/wasm/";

let _embedder: any | null = null;

/** Load once (lazy). Model: MiniLM-L6-v2, quantized, pooled+normalized. */
export async function loadEmbedder(onProgress?: (p: any) => void) {
  if (_embedder) return _embedder;
  _embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
    quantized: true,
    progress_callback: onProgress,
  });
  return _embedder;
}

/** Embed single text. Returns a normalized Float32Array. */
export async function embedText(text: string): Promise<Float32Array> {
  const embedder = await loadEmbedder();
  const out = await embedder(text, { pooling: "mean", normalize: true });
  return out.data as Float32Array;
}

/**
 * Embed many texts with progress. Yields back to the browser periodically
 * so the UI doesn’t “freeze”.
 */
export async function embedMany(
  texts: string[],
  onStep?: (i: number, total: number) => void
): Promise<Float32Array[]> {
  const out: Float32Array[] = [];
  const total = texts.length;
  for (let i = 0; i < total; i++) {
    const v = await embedText(texts[i]);
    out.push(v);
    onStep?.(i + 1, total);
    // Yield every few items to keep UI responsive
    if ((i + 1) % 5 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  return out;
}
