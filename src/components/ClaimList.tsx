// src/components/ClaimList.tsx
import * as React from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import type { Claim } from "../lib/claims";

type Status = "supported" | "unknown" | "pending";

export default function ClaimList({
  claims,
  statuses,
  onView,
}: {
  claims: Claim[];
  statuses: Record<string, Status>;
  onView: (c: Claim) => void;
}) {
  if (!claims || claims.length === 0) {
    return (
      <div className="text-sm text-slate-300/80">
        No claims yet. Paste text and click <span className="font-semibold">Extract Claims</span>.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {claims.map((c) => (
        <ClaimRow
          key={c.id}
          claim={c}
          status={statuses[c.id] ?? "pending"}
          onView={() => onView(c)}
        />
      ))}
    </div>
  );
}

function ClaimRow({
  claim,
  status,
  onView,
}: {
  claim: Claim;
  status: Status;
  onView: () => void;
}) {
  const statusIntent =
    status === "supported" ? ("success" as const) : status === "unknown" ? ("warn" as const) : ("info" as const);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge intent={statusIntent} className="shrink-0 capitalize">
              {status}
            </Badge>
            <KindChip kind={claim.kind} />
          </div>
          <div className="mt-1 text-sm leading-relaxed text-white line-clamp-2 break-words">
            {claim.text}
          </div>
        </div>
        <div className="shrink-0">
          <Button size="sm" onClick={onView}>
            View evidence
          </Button>
        </div>
      </div>
    </div>
  );
}

function KindChip({ kind }: { kind: Claim["kind"] }) {
  const label =
    kind === "number" ? "number" : kind === "date" ? "date" : kind === "quoted" ? "quoted" : "entity";
  return (
    <span
      className="rounded-full px-2 py-[2px] text-[11px] uppercase tracking-wide
                 bg-white/10 border border-white/15 text-slate-200"
      aria-label={`claim kind: ${label}`}
      title={`Detected as ${label}`}
    >
      {label}
    </span>
  );
}
