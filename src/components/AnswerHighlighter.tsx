// src/components/AnswerHighlighter.tsx
import * as React from "react";
import type { Claim } from "../lib/claims";
import CitationChip from "./CitationChip";

/**
 * Renders the answer with inline colored spans for claims.
 * - supported => green
 * - unknown/pending => amber
 * If evidence exists for a claim, shows a small citation chip that, when clicked,
 * calls onJump(claimId, chunkIdx) so parent can switch to Sources tab and scroll/glow.
 */

type Status = "supported" | "unknown" | "pending";

export default function AnswerHighlighter({
  text,
  claims,
  statuses,
  evidenceByClaim,
  onJump,
}: {
  text: string;
  claims: Claim[];
  statuses: Record<string, Status>;
  evidenceByClaim: Record<string, { idx: number }[] | undefined>;
  onJump: (claimId: string, chunkIdx: number) => void;
}) {
  if (!text) {
    return (
      <div className="text-muted text-sm">
        Paste an answer above, extract claims, and you’ll see colored highlights here.
      </div>
    );
  }

  // Sort by start; ignore overlapping for this baby-step version.
  const sorted = [...claims].sort((a, b) => a.start - b.start);

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (const c of sorted) {
    // Guard against bad indices
    const start = Math.max(0, Math.min(c.start, text.length));
    const end = Math.max(start, Math.min(c.end, text.length));
    if (cursor < start) {
      nodes.push(<span key={`gap-${cursor}-${start}`}>{text.slice(cursor, start)}</span>);
    }

    const status = statuses[c.id] || "pending";
    const cls =
      status === "supported" ? "hl-supported" :
      status === "unknown" ? "hl-unknown" : "hl-pending";

    const evidence = evidenceByClaim[c.id];
    const topChunkIdx = evidence && evidence.length ? evidence[0].idx : null;

    nodes.push(
      <span key={`claim-${c.id}`} className={`inline-block ${cls}`}>
        {text.slice(start, end)}
        {topChunkIdx !== null && (
          <CitationChip
            label="[C]"
            title={`Jump to source chunk ${topChunkIdx}`}
            onClick={() => onJump(c.id, topChunkIdx)}
          />
        )}
      </span>
    );

    cursor = end;
  }

  if (cursor < text.length) {
    nodes.push(<span key={`tail-${cursor}`}>{text.slice(cursor)}</span>);
  }

  return (
    <div
      className="prose-invert prose-sm max-w-none leading-relaxed"
      style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}
    >
      {nodes}
    </div>
  );
}
