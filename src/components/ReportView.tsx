// src/components/ReportView.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import type { Claim } from "../lib/claims";
import type { EvidenceItem } from "../lib/retrieval";
import { buildReportJSON, buildReportMarkdown } from "../lib/report";

type Status = "supported" | "unknown" | "pending";

export default function ReportView({
  answer,
  draft,
  claims,
  statuses,
  evidenceByClaim,
}: {
  answer: string;
  draft?: string;
  claims: Claim[];
  statuses: Record<string, Status>;
  evidenceByClaim: Record<string, EvidenceItem[] | undefined>;
}) {
  const report = React.useMemo(
    () => buildReportJSON(answer, draft, claims, statuses, evidenceByClaim),
    [answer, draft, claims, statuses, evidenceByClaim]
  );

  const [copied, setCopied] = React.useState(false);

  async function copyMarkdown() {
    const md = buildReportMarkdown(report);
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `hallucination-guard-report-${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const supported = report.summary.supported;
  const unknown = report.summary.unknown;
  const total = report.summary.total || 1;

  const supPct = Math.round((supported / total) * 100);
  const unkPct = 100 - supPct;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {/* Claim table */}
      <Card>
        <CardHeader>
          <CardTitle>Claims</CardTitle>
        </CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <div className="text-sm text-muted">No claims yet. Go to Review and Extract Claims.</div>
          ) : (
            <div className="max-h-[360px] overflow-auto pr-1">
              <table className="w-full text-sm">
                <thead className="text-muted">
                  <tr>
                    <th className="text-left pr-2">#</th>
                    <th className="text-left pr-2">Status</th>
                    <th className="text-left">Claim</th>
                    <th className="text-right">Cites</th>
                  </tr>
                </thead>
                <tbody>
                  {report.claims.map((r, i) => (
                    <tr key={r.id} className="border-t border-white/10">
                      <td className="py-2 align-top pr-2">{i + 1}</td>
                      <td className="py-2 align-top pr-2">
                        <Badge intent={r.status === "supported" ? "success" : "warn"}>{r.status}</Badge>
                      </td>
                      <td className="py-2 align-top">{r.text}</td>
                      <td className="py-2 align-top text-right">
                        {r.citations.length ? r.citations.map(c => <span key={c} className="ml-1">[C{c}]</span>) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <Button onClick={copyMarkdown}>{copied ? "Copied!" : "Copy Markdown"}</Button>
            <Button variant="outline" onClick={downloadJSON}>Download JSON</Button>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard + Diff preview */}
      <Card>
        <CardHeader>
          <CardTitle>Factuality Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted">Supported vs Unknown</div>
          {/* simple stacked bar */}
          <div className="mt-2 h-3 w-full rounded-full bg-black/30 overflow-hidden border border-white/10">
            <div className="h-full bg-[#34D399]" style={{ width: `${supPct}%`, boxShadow: "0 0 8px rgba(52,211,153,.5)" }} />
            <div className="h-full bg-[#F59E0B]" style={{ width: `${unkPct}%` }} />
          </div>
          <div className="mt-1 text-xs">
            <span className="mr-3">Supported: <strong>{supported}</strong></span>
            <span>Unknown: <strong>{unknown}</strong></span>
          </div>

          {/* Draft presence */}
          <div className="mt-4">
            <div className="text-xs text-muted mb-1">Fix Draft</div>
            {draft ? (
              <div className="rounded-lg bg-black/30 border border-white/10 p-2 text-xs max-h-[130px] overflow-auto">
                {draft.length > 600 ? draft.slice(0, 600) + "…" : draft}
              </div>
            ) : (
              <div className="text-sm text-muted">No draft yet — generate one in Review &gt; Fix Draft.</div>
            )}
          </div>

          {/* Diff */}
          {report.diff && (
            <div className="mt-4">
              <div className="text-xs text-muted mb-1">Rough Diff</div>
              <pre className="rounded-lg bg-black/30 border border-white/10 p-2 text-xs max-h-[140px] overflow-auto whitespace-pre-wrap">
{report.diff}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* References */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>References</CardTitle>
        </CardHeader>
        <CardContent>
          {report.references.length === 0 ? (
            <div className="text-sm text-muted">No citations yet. View evidence for at least one claim.</div>
          ) : (
            <ul className="list-disc pl-5 text-sm space-y-1">
              {report.references.map(r => (
                <li key={r.cid}><strong>[C{r.cid}]</strong> {r.snippet}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
