// src/lib/fix.ts
/**
 * Fix-draft generation:
 * - Tries to use WebLLM (loaded lazily at runtime).
 * - If unavailable/blocked, falls back to a safe template rewrite.
 *
 * IMPORTANT: We do NOT import WebLLM at the top of the file.
 * We lazy-load via dynamic import + /* @vite-ignore * / so Vite build doesn't resolve it.
 */

export type EvidenceItem = {
  idx: number;
  text: string;
  score: number;
  overlap: number;
};

export type Claim = {
  id: string;
  text: string;
};

export type FixInputs = {
  answer: string;
  claims: Claim[];
  statuses: Record<string, "supported" | "unknown" | "pending">;
  evidenceByClaim: Record<string, EvidenceItem[]>;
};

export type FixResult = {
  draft: string;
  used: "webllm" | "template";
};

/** Check if WebGPU *might* be available. */
export function canUseWebGPU(): boolean {
  return !!(globalThis as any).navigator?.gpu;
}

/** Lazy load WebLLM at runtime. Returns the module or null on failure. */
export async function loadWebLLM(): Promise<any | null> {
  const url = "https://esm.run/@mlc-ai/web-llm";
  try {
    // Avoid Vite trying to pre-bundle this external URL at build time:
    const mod = await import(/* @vite-ignore */ url);
    return mod;
  } catch (_err) {
    return null;
  }
}

/**
 * Try generating a draft with WebLLM.
 * This function is defensive: if anything fails, it throws and callers should fallback to template.
 */
export async function generateWithWebLLM(inputs: FixInputs): Promise<string> {
  const webllm = await loadWebLLM();
  if (!webllm) throw new Error("WebLLM unavailable");

  // The actual API may evolve; use a conservative, generic approach.
  // We build a compact prompt and try to call a small default engine if available.
  const sys =
    "You rewrite the user's answer so every claim is grounded by the provided evidence snippets. " +
    "Keep only supported facts. Where evidence is weak, mark TODO and cite chunk ids. " +
    "Use concise, factual tone. Add inline citation markers like [C1], [C2] where appropriate.";

  const evidenceLines: string[] = [];
  for (const c of inputs.claims) {
    const items = inputs.evidenceByClaim[c.id] || [];
    const tag = inputs.statuses[c.id] || "unknown";
    const best = items.slice(0, 2).map((it) => `[C${it.idx}] ${it.text.replace(/\s+/g, " ").slice(0, 280)}`);
    evidenceLines.push(
      `- Claim: "${c.text}" | status: ${tag} | evidence:\n  ${best.map((b) => "- " + b).join("\n  ")}`
    );
  }
  const prompt =
    `${sys}\n\nUSER ANSWER:\n${inputs.answer}\n\nEVIDENCE:\n${evidenceLines.join("\n")}\n\n` +
    "Rewrite now. Add citation markers [C#] next to supported statements. " +
    "For unsupported statements, rewrite with TODO and the most relevant [C#] if any.";

  // Try to create an engine with a very small, safe default. If it fails, throw to fallback.
  const { CreateMLCEngine } = webllm as any;
  if (typeof CreateMLCEngine !== "function") {
    throw new Error("WebLLM engine not available");
  }

  // Minimal engine creation attempt; WebLLM will choose a default small model if not specified.
  const engine = await CreateMLCEngine(
    {
      model: "qwen2.5-0.5b-instruct-q4f16_1-MLC", // hint; engine may choose a closest available tiny model
    },
    {
      initProgressCallback: (_p: any) => {
        // No-op; UI handles progress elsewhere if desired.
      },
    }
  );

  const out = await engine.chat.completions.create({
    messages: [
      { role: "system", content: "You are a precise, concise factual editor." },
      { role: "user", content: prompt },
    ],
    stream: false,
    temperature: 0.2,
    max_tokens: 800,
  });

  const text =
    out?.choices?.[0]?.message?.content ||
    "Draft generation succeeded but returned empty content.";
  return text;
}

/** Template-based fallback generator (always works, no models). */
export function generateTemplateDraft(inputs: FixInputs): string {
  const lines: string[] = [];
  lines.push("## Grounded Revision (Template Mode)");
  lines.push("");
  lines.push("> This draft keeps supported facts and annotates uncertain parts with TODO.");
  lines.push("");

  let body = inputs.answer;

  // For each unsupported/unknown claim, append a TODO line and suggest evidence.
  const notes: string[] = [];
  for (const c of inputs.claims) {
    const status = inputs.statuses[c.id];
    if (status === "supported") continue;

    const items = (inputs.evidenceByClaim[c.id] || []).slice(0, 2);
    const cites = items.map((it) => `[C${it.idx}]`).join(" ");
    const snippet = items.length ? items[0].text.replace(/\s+/g, " ").slice(0, 200) : "(no close match)";
    notes.push(`- TODO: Verify/ground: "${c.text}" ${cites}  · Hint: ${snippet}`);
  }

  // Append notes block at end of body:
  if (notes.length) {
    lines.push("### TODOs (needs grounding)");
    lines.push(...notes);
    lines.push("");
  }

  // Add a References block from union of evidence items:
  const seen = new Set<number>();
  const refs: string[] = [];
  for (const arr of Object.values(inputs.evidenceByClaim)) {
    for (const it of arr || []) {
      if (seen.has(it.idx)) continue;
      seen.add(it.idx);
      refs.push(`[C${it.idx}] ${it.text.replace(/\s+/g, " ").slice(0, 260)}`);
    }
  }
  if (refs.length) {
    lines.push("### References (chunks)");
    lines.push(...refs.map((r) => "- " + r));
  }

  return lines.join("\n");
}

/** High-level helper used by the UI. */
export async function generateFixDraft(inputs: FixInputs): Promise<FixResult> {
  // Prefer WebLLM only if WebGPU is available; otherwise skip straight to template.
  if (canUseWebGPU()) {
    try {
      const draft = await generateWithWebLLM(inputs);
      return { draft, used: "webllm" };
    } catch (_err) {
      // fall through to template
    }
  }
  const draft = generateTemplateDraft(inputs);
  return { draft, used: "template" };
}

// Default export (makes it easy to import everything)
export default {
  canUseWebGPU,
  loadWebLLM,
  generateWithWebLLM,
  generateTemplateDraft,
  generateFixDraft,
};
