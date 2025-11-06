// src/components/StorageMeter.tsx
import * as React from "react";

/**
 * StorageMeter
 * - Reads navigator.storage.estimate() to show usage/quota.
 * - Refreshes when the parent changes `refreshKey` or when user clicks Refresh.
 */
export default function StorageMeter({ refreshKey = 0 }: { refreshKey?: number }) {
  const [usage, setUsage] = React.useState<number>(0);
  const [quota, setQuota] = React.useState<number>(0);
  const [loading, setLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  async function load() {
    try {
      setLoading(true);
      if ("storage" in navigator && (navigator as any).storage?.estimate) {
        const est = await (navigator as any).storage.estimate();
        // est.usage / est.quota are in bytes
        setUsage(est.usage ?? 0);
        setQuota(est.quota ?? 0);
      } else {
        // Fallback: unknown quota; show 0/0 with a hint
        setUsage(0);
        setQuota(0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function fmtMB(b: number) {
    return (b / (1024 * 1024)).toFixed(1) + " MB";
  }

  const pct =
    quota > 0 ? Math.min(100, Math.round((usage / quota) * 100)) : 0;

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-300/90">
          <span className="text-slate-100">Storage:</span>{" "}
          {quota > 0 ? (
            <>
              {fmtMB(usage)} / {fmtMB(quota)}{" "}
              <span className="text-slate-400">({pct}%)</span>
            </>
          ) : (
            "estimating…"
          )}
        </div>
        <button
          className="rounded-full px-2.5 py-1 text-xs border border-white/15 bg-white/10 hover:bg-white/15"
          onClick={load}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="mt-2 h-2 w-full rounded-full bg-black/30 overflow-hidden">
        <div
          className="h-full bg-[#8B5CF6]"
          style={{
            width: `${pct}%`,
            boxShadow: "0 0 12px rgba(139,92,246,.55)",
          }}
        />
      </div>
      <div className="mt-1 text-[11px] text-slate-400">
        Uses browser storage (IndexedDB). Clearing local data wipes everything.
      </div>
    </div>
  );
}
