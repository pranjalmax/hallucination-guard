// src/components/StorageMeter.tsx
import * as React from "react";
import { Button } from "./ui/button";

type Est = { used: number; quota: number };

function fmt(bytes: number): string {
  const gb = 1024 ** 3;
  const mb = 1024 ** 2;
  if (bytes >= gb) return `${(bytes / gb).toFixed(2)} GB`;
  return `${(bytes / mb).toFixed(1)} MB`;
}

async function estimate(): Promise<Est> {
  try {
    // navigator.storage.estimate is best-effort (varies by browser/origin)
    const est = await (navigator.storage as any)?.estimate?.();
    return { used: est?.usage ?? 0, quota: est?.quota ?? 0 };
  } catch {
    return { used: 0, quota: 0 };
  }
}

export default function StorageMeter({ refreshKey = 0 }: { refreshKey?: number }) {
  const [est, setEst] = React.useState<Est>({ used: 0, quota: 0 });
  const [updating, setUpdating] = React.useState(false);

  const recalc = React.useCallback(async () => {
    setUpdating(true);
    const e = await estimate();
    setEst(e);
    setUpdating(false);
  }, []);

  React.useEffect(() => {
    recalc();
    // light auto-refresh every 10s in case background writes happen
    const t = setInterval(recalc, 10000);
    return () => clearInterval(t);
  }, [recalc, refreshKey]);

  const pct =
    est.quota > 0 ? Math.min(100, Math.round((est.used / est.quota) * 100)) : 0;

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">
          <div className="text-xs text-muted">Storage used</div>
          <div className="text-white">
            {fmt(est.used)}
            {est.quota ? (
              <span className="text-muted"> {" "}of {fmt(est.quota)} ({pct}%)</span>
            ) : null}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={recalc} disabled={updating}>
          {updating ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-black/30 overflow-hidden">
        <div
          className="h-full bg-accentCyan"
          style={{ width: `${pct}%`, boxShadow: "0 0 12px rgba(34,211,238,.45)" }}
        />
      </div>
    </div>
  );
}
