// src/lib/fix.ts
import type { Claim } from "./claims";
import type { EvidenceItem } from "./retrieval";

type Status = "supported" | "unknown" | "pending";

export type FixOptions = {
  useWebLLM?: boolean;
  onStatus?: (msg: string) => void;
};

/**
 * Build a compact evidence table string for prompting or footnotes.
 */
function buildEvidenceTable(
  claims: Claim[],
  statuses: Record<string, Status>,
  evidenceByClaim: Record<string, EvidenceItem[] | undefined>
) {
  const rows: string[] = [];
  for (const c of claims) {
    const status = statuses[c.id] || "pending";
    const ev = evidenceByClaim[c.id]?.[0];
    const cid = ev ? `C${ev.idx}` : "-";
    const snip = ev ? ev.text.replace(/\s+/g, " ").slice(0, 240) : "";
    rows.push(
      `- ${cid} | ${status.padEnd(8)} | "${c.text.slice(0, 160)}"${snip ? ` | ${snip}` : ""}`
    );
  }
  return rows.join("\n");
}

/**
 * Template-mode rewrite:
 *  - After each claim span, add [C{idx}] if supported
 *  - If unknown and we have a snippet, add "(grounded from C{idx}: «snippet…»)"
 *  - If unknown and no snippet, add "[TODO: verify]"
 * Returns a single "revised" text string.
 */
export function generateTemplateFix(
  answer: string,
  claims: Claim[],
  statuses: Record<string, Status>,
  evidenceByClaim: Record<string, EvidenceItem[] | undefined>
): string {
  const sorted = [...claims].sort((a, b) => a.start - b.start);
  let out = "";
  let cursor = 0;

  for (const c of sorted) {
    const start = Math.max(0, Math.min(c.start, answer.length));
    const end = Math.max(start, Math.min(c.end, answer.length));
    if (cursor < start) out += answer.slice(cursor, start);

    const status = statuses[c.id] || "pending";
    const ev = evidenceByClaim[c.id]?.[0];

    // keep original span
    out += answer.slice(start, end);

    if (status === "supported" && ev) {
      out += ` [C${ev.idx}]`;
    } else if (status !== "supported") {
      if (ev) {
        const snip = ev.text.replace(/\s+/g, " ").slice(0, 180);
        out += ` (grounded from C${ev.idx}: «${snip}» )`;
      } else {
        out += ` [TODO: verify]`;
      }
    }

    cursor = end;
  }
  if (cursor < answer.length) out += answer.slice(cursor);

  // Add reference footer
  const footRows: string[] = [];
  const seen = new Set<number>();
  for (const c of sorted) {
    const ev = evidenceByClaim[c.id]?.[0];
    if (!ev) continue;
    if (seen.has(ev.idx)) continue;
    seen.add(ev.idx);
    footRows.push(`- C${ev.idx}: ${ev.text.replace(/\s+/g, " ").slice(0, 300)}`);
  }

  const footer =
    footRows.length > 0
      ? `\n\nReferences:\n${footRows.join("\n")}\n`
      : "";

  return out + footer;
}

/**
 * Try WebLLM (optional). If anything fails, return null and caller will fallback.
 * Uses a tiny model so it can run in-browser (WebGPU preferred).
 *
 * NOTE: This path relies on CDN availability and may be blocked by privacy tools.
 */
async function tryWebLLMRewrite(
  answer: string,
  claims: Claim[],
  statuses: Record<string, Status>,
  evidenceByClaim: Record<string, EvidenceItem[] | undefined>,
  onStatus?: (m: string) => void
): Promise<string | null> {
  try {
    onStatus?.("Loading WebLLM…");
    // Dynamic ESM import to avoid bundling issues; @vite-ignore lets Vite treat it as runtime URL.
    const webllm: any = await import(
      /* @vite-ignore */ "https://esm.run/@mlc-ai/web-llm"
    );
    const { CreateMLCEngine } = webllm;
    const model = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC"; // small, fast, no cost
    onStatus?.("Initializing model (first run may download files) …");
    const engine = await CreateMLCEngine(model, {
      // Provide a minimal progress callback if available
      initProgressCallback: (p: any) => {
        if (p?.progress) onStatus?.(`Downloading model… ${Math.round(p.progress * 100)}%`);
      },
    });

    const evidenceTable = buildEvidenceTable(claims, statuses, evidenceByClaim);
    const prompt = [
      "You are a careful fact-grounding assistant.",
      "Task: Rewrite the user's answer to be factual and cite local evidence.",
      "Rules:",
      " - Keep original structure/voice where possible.",
      " - After each factual claim, add an inline citation like [C{idx}] that maps to the provided chunk id.",
      " - If you cannot verify a claim with the evidence, keep it but add [TODO] and do NOT fabricate.",
      " - Only use the provided evidence table; do not invent facts.",
      "",
      "Evidence Table (C{idx} | status | claim | snippet):",
      evidenceTable || "(none)",
      "",
      "Now produce the revised answer only, followed by a 'References:' list mapping each C{idx} to a short source snippet.",
      "",
      "User's answer:",
      answer,
    ].join("\n");

    onStatus?.("Generating…");
    const reply = await engine.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 800,
    });

    const text = reply?.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    return text;
  } catch (err) {
    console.warn("WebLLM path failed, falling back to template:", err);
    return null;
  } finally {
    onStatus?.(""); // clear
  }
}

/**
 * Generate a grounded fix draft.
 * - Tries WebLLM if requested; falls back to template rewrite.
 */
export async function generateFixDraft(
  answer: string,
  claims: Claim[],
  statuses: Record<string, Status>,
  evidenceByClaim: Record<string, EvidenceItem[] | undefined>,
  opts: FixOptions = {}
): Promise<string> {
  const useWebLLM = !!opts.useWebLLM;

  if (useWebLLM) {
    const text = await tryWebLLMRewrite(answer, claims, statuses, evidenceByClaim, opts.onStatus);
    if (text) return text;
  }

  return generateTemplateFix(answer, claims, statuses, evidenceByClaim);
}
