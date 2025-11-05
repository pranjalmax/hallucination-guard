// src/lib/diff.ts
/** Very rough sentence-level diff for Markdown display */
export function roughSentenceDiff(before: string, after: string): string {
  const split = (s: string) =>
    s.split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);

  const a = new Set(split(before));
  const b = new Set(split(after));

  const removed = [...a].filter(s => !b.has(s));
  const added = [...b].filter(s => !a.has(s));

  const lines: string[] = [];
  if (removed.length) {
    lines.push("**Removed:**");
    for (const s of removed) lines.push(`- ${s}`);
  }
  if (added.length) {
    if (removed.length) lines.push("");
    lines.push("**Added:**");
    for (const s of added) lines.push(`+ ${s}`);
  }
  return lines.join("\n");
}
