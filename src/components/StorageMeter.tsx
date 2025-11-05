// src/components/StorageMeter.tsx
import * as React from "react";
import { getStorageEstimate } from "../lib/storage";
import { Button } from "./ui/button";

export default function StorageMeter({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const [used, setUsed] = React.useState(0);
  const [quota, setQuota] = React.useState(0);

  async function load() {
    const { used, quota } = await getStorageEstimate();
    setUsed(used);
    setQuota(quota || 1);
  }

  React.useEffect(() => {
    load();
  }, [refreshKey]);

  const pct = Math.min(100, Math.round((used / quota) * 100));

  function fmt(n: number) {
    if (n > 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + " MB";
    if (n > 1024) return (n / 1024).toFixed(1) + " KB";
    return n + " B";
  }

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between text-xs">
        <div className="text-muted">
          Storage: <span className="text-white">{fmt(used)}</span> / {fmt(quota)}
        </div>
        <Button variant="ghost" className="h-8 px-2" onClick={load}>
          Refresh
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
