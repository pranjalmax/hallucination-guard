// src/lib/report.ts
import type { Claim } from "./claims";
import type { EvidenceItem } from "./retrieval";
import { roughSentenceDiff } from "./diff";

type Status = "supported" | "unknown" | "pending";

export type ReportJSON = {
  generatedAt: string;
  summary: { total: number; supported: number; unknown: number };
  answer: string;
  draft?: string;
  claims: Array<{
    id: string;
    text: string;
    status: Status;
    citations: number[]; // chunk idxs
    topSnippet?: string;
  }>;
  references: Array<{ cid: number; snippet: string }>;
  diff?: string; // patch-like markdown
};

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function buildReportJSON(
  answer: string,
  draft: string | undefined,
  claims: Claim[],
  statuses: Record<string, Status>,
  evidenceByClaim: Record<string, EvidenceItem[] | undefined>
): ReportJSON {
  const rows = claims.map((c) => {
    const items = evidenceByClaim[c.id] || [];
    const cids = items.slice(0, 3).map(it => it.idx);
    const top = items[0];
    return {
      id: c.id,
      text: c.text,
      status: statuses[c.id] || "pending",
      citations: cids,
      topSnippet: top ? top.text.replace(/\s+/g, " ").slice(0, 280) : undefined,
    };
  });

  const supported = rows.filter(r => r.status === "supported").length;
  const unknown = rows.filter(r => r.status !== "supported").length;

  const allC = unique(rows.flatMap(r => r.citations));
  const refs = allC.map(cid => {
    // try to find a snippet from any claim using this cid
    for (const c of claims) {
      const it = (evidenceByClaim[c.id] || []).find(e => e.idx === cid);
      if (it) return { cid, snippet: it.text.replace(/\s+/g, " ").slice(0, 320) };
    }
    return { cid, snippet: "" };
  });

  const diff = draft ? roughSentenceDiff(answer, draft) : undefined;

  return {
    generatedAt: new Date().toISOString(),
    summary: { total: claims.length, supported, unknown },
    answer,
    draft,
    claims: rows,
    references: refs,
    diff,
  };
}

export function buildReportMarkdown(json: ReportJSON): string {
  const lines: string[] = [];
  lines.push(`# Hallucination Guard — Review Report`);
  lines.push(`_Generated: ${json.generatedAt}_`);
  lines.push("");
  lines.push(`**Summary** — total: ${json.summary.total}, supported: ${json.summary.supported}, unknown: ${json.summary.unknown}`);
  lines.push("");

  // claim table (compact)
  lines.push(`| # | Status | Claim | Citations |`);
  lines.push(`|:-:|:------:|-------|:---------:|`);
  json.claims.forEach((r, i) => {
    const cites = r.citations.map(c => `[C${c}]`).join(" ");
    lines.push(`| ${i + 1} | ${r.status} | ${r.text.replace(/\|/g, "\\|")} | ${cites || "-"} |`);
  });

  lines.push("");
  if (json.draft) {
    lines.push(`## Before / After`);
    lines.push(`**Before (answer):**`);
    lines.push("");
    lines.push("```");
    lines.push(json.answer);
    lines.push("```");
    lines.push("");
    lines.push(`**After (fix draft):**`);
    lines.push("");
    lines.push("```");
    lines.push(json.draft);
    lines.push("```");
  }

  if (json.diff) {
    lines.push("");
    lines.push(`## Rough Diff`);
    lines.push(json.diff);
  }

  if (json.references.length) {
    lines.push("");
    lines.push(`## References`);
    for (const r of json.references) {
      lines.push(`- C${r.cid}: ${r.snippet}`);
    }
  }

  lines.push("");
  lines.push(`_Note: Status "unknown" means not confidently supported by top-k evidence; it is not a contradiction signal._`);
  return lines.join("\n");
}
