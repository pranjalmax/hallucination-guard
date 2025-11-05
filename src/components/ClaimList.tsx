// src/components/ClaimList.tsx
import * as React from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import type { Claim } from "../lib/claims";

export default function ClaimList({
  claims,
  statuses,
  onView,
}: {
  claims: Claim[];
  statuses?: Record<string, "supported" | "unknown" | "pending">;
  onView?: (c: Claim) => void;
}) {
  if (!claims?.length) {
    return <div className="text-muted text-sm">No claims yet — paste an answer and click Extract.</div>;
  }

  return (
    <div className="space-y-2">
      {claims.map((c, i) => {
        const st = statuses?.[c.id] || "pending";
        const label =
          st === "supported" ? "supported" :
          st === "unknown" ? "unknown" : "pending";
        const intent =
          st === "supported" ? "success" :
          st === "unknown" ? "warn" : undefined;

        return (
          <div key={c.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="text-xs text-muted">Claim {i + 1}</div>
              <Badge intent={intent as any}>{label}</Badge>
            </div>
            <div className="text-sm leading-relaxed">
              {c.text.length > 360 ? c.text.slice(0, 360) + "…" : c.text}
            </div>
            <div className="mt-2 flex items-center gap-2">
              {c.tags.map((t) => (
                <Badge key={t} intent={t === "number" ? "info" : t === "date" ? "warn" : "success"}>
                  {t}
                </Badge>
              ))}
              <div className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => onView?.(c)}
                title="View evidence"
              >
                View evidence
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
