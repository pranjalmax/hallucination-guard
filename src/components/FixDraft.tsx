// src/components/FixDraft.tsx
import * as React from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useToast } from "./ui/use-toast";
import type { Claim } from "../lib/claims";
import type { EvidenceItem } from "../lib/retrieval";
import { generateFixDraft } from "../lib/fix";

type Status = "supported" | "unknown" | "pending";

export default function FixDraft({
  answer,
  claims,
  statuses,
  evidenceByClaim,
  onDraftReady,
}: {
  answer: string;
  claims: Claim[];
  statuses: Record<string, Status>;
  evidenceByClaim: Record<string, EvidenceItem[] | undefined>;
  onDraftReady?: (text: string) => void;
}) {
  const { push } = useToast();
  const [useWebLLM, setUseWebLLM] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [statusMsg, setStatusMsg] = React.useState("");
  const [draft, setDraft] = React.useState("");

  async function onGenerate() {
    if (!answer.trim()) {
      push({ title: "No answer", description: "Paste an answer in the editor first." });
      return;
    }
    if (claims.length === 0) {
      push({ title: "No claims", description: "Extract claims before generating a fix." });
      return;
    }
    setRunning(true);
    setDraft("");
    try {
      const text = await generateFixDraft(answer, claims, statuses, evidenceByClaim, {
        useWebLLM,
        onStatus: setStatusMsg,
      });
      setDraft(text);
      onDraftReady?.(text);
      push({ title: "Fix draft ready", description: useWebLLM ? "WebLLM or fallback used." : "Template mode." });
    } catch (err: any) {
      console.error(err);
      push({ title: "Fix generation error", description: String(err?.message || err) });
    } finally {
      setRunning(false);
      setStatusMsg("");
    }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(draft || "");
      push({ title: "Copied", description: "Draft copied to clipboard." });
    } catch {
      push({ title: "Copy failed", description: "Select and copy manually." });
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <Button onClick={onGenerate} disabled={running}>
          {running ? "Generating…" : "Generate Fix Draft"}
        </Button>
        <label className="inline-flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            className="accent-accentCyan"
            checked={useWebLLM}
            onChange={(e) => setUseWebLLM(e.target.checked)}
          />
          Try WebLLM (experimental)
        </label>
        {statusMsg && <span className="text-xs text-muted">{statusMsg}</span>}
      </div>

      {!draft && (
        <div className="text-xs text-muted">
          Output will appear here. If WebLLM can’t load, we’ll use a safe template rewrite.
        </div>
      )}

      {draft && (
        <>
          <div className="mb-2">
            <Badge intent="info">Draft</Badge>
          </div>
          <textarea
            className="w-full min-h-[200px] rounded-xl bg-black/30 border border-white/10 p-3 text-sm"
            value={draft}
            readOnly
          />
          <div className="mt-2">
            <Button variant="outline" onClick={onCopy}>Copy Draft</Button>
          </div>
        </>
      )}
    </div>
  );
}
