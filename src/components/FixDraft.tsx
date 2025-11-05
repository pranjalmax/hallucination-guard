// src/components/FixDraft.tsx
import * as React from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useToast } from "./ui/use-toast";

import type { Claim } from "../lib/claims";
import type { EvidenceItem } from "../lib/retrieval";
import { generateFixDraft, type FixResult } from "../lib/fix";

type Props = {
  answer: string;
  claims: Claim[];
  statuses: Record<string, "supported" | "unknown" | "pending">;
  evidenceByClaim: Record<string, EvidenceItem[]>;
  /** Called with the final draft text (string) once generated */
  onDraftReady?: (text: string) => void;
};

export default function FixDraft(props: Props) {
  const { push } = useToast();

  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<FixResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function onGenerate() {
    if (!props.answer.trim()) {
      push({ title: "Nothing to rewrite", description: "Paste an answer on the left first." });
      return;
    }
    if (props.claims.length === 0) {
      push({ title: "No claims", description: "Click Extract Claims before generating a draft." });
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await generateFixDraft({
        answer: props.answer,
        claims: props.claims,
        statuses: props.statuses,
        evidenceByClaim: props.evidenceByClaim,
      });
      setResult(r);
      props.onDraftReady?.(r.draft);
      push({
        title: "Fix draft ready",
        description: r.used === "webllm" ? "Generated via WebLLM (on-device)." : "Generated via template mode.",
      });
    } catch (e: any) {
      const msg = String(e?.message || e);
      setError(msg);
      push({ title: "Draft error", description: msg });
    } finally {
      setLoading(false);
    }
  }

  async function onCopy() {
    if (!result?.draft) return;
    try {
      await navigator.clipboard.writeText(result.draft);
      push({ title: "Copied", description: "Fix draft copied to clipboard." });
    } catch {
      push({ title: "Copy failed", description: "Your browser blocked clipboard access." });
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Button onClick={onGenerate} disabled={loading}>
          {loading ? "Generating…" : "Generate Fix Draft"}
        </Button>
        {result?.used && (
          <Badge intent={result.used === "webllm" ? "info" : "warn"}>
            {result.used === "webllm" ? "WebLLM" : "Template"}
          </Badge>
        )}
      </div>

      {error && (
        <div className="mt-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="mt-3 rounded-xl bg-black/30 border border-white/10 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">Draft</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onCopy} disabled={!result?.draft}>
              Copy Draft
            </Button>
          </div>
        </div>
        <div className="text-sm leading-relaxed whitespace-pre-wrap min-h-[120px]">
          {result?.draft || "Click “Generate Fix Draft” to produce a grounded revision here."}
        </div>
      </div>
    </div>
  );
}
