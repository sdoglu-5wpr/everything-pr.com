import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Play, Square, RefreshCw, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  getMediaBackfillStats,
  runMediaBackfillBatch,
} from "@/serverFns/media-backfill.functions";

export const Route = createFileRoute("/admin/_protected/media-backfill")({
  component: MediaBackfillPage,
});

type Stats = { total: number; done: number; pending: number };

function MediaBackfillPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [running, setRunning] = useState(false);
  const [batchSize, setBatchSize] = useState(15);
  const [log, setLog] = useState<string[]>([]);
  const [counters, setCounters] = useState({ uploaded: 0, failed: 0, skipped: 0 });
  const [recentErrors, setRecentErrors] = useState<Array<{ id: number; url: string; error: string }>>([]);
  const stopRef = useRef(false);

  const refresh = async () => {
    try {
      const r = await getMediaBackfillStats();
      setStats(r as Stats);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load stats");
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase.auth.getSession();
        if (!data.session || cancelled) return;
        await new Promise((r) => setTimeout(r, 50));
        if (!cancelled) refresh();
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const start = async () => {
    if (running) return;
    stopRef.current = false;
    setRunning(true);
    setCounters({ uploaded: 0, failed: 0, skipped: 0 });
    setLog([]);
    setRecentErrors([]);

    while (!stopRef.current) {
      try {
        const r = await runMediaBackfillBatch({ data: { batchSize } });
        setCounters((c) => ({
          uploaded: c.uploaded + r.uploaded,
          failed: c.failed + r.failed,
          skipped: c.skipped + r.skipped,
        }));
        if (r.errors?.length) setRecentErrors(r.errors);
        setLog((l) => [
          `${new Date().toLocaleTimeString()}  +${r.uploaded} uploaded · ${r.failed} failed · ${r.skipped} skipped`,
          ...l,
        ].slice(0, 50));
        await refresh();
        if ((r.processed ?? 0) === 0) {
          toast.success("All done!");
          break;
        }
      } catch (e: any) {
        toast.error(e?.message ?? "Batch failed");
        setLog((l) => [`${new Date().toLocaleTimeString()}  ERROR ${e?.message}`, ...l].slice(0, 50));
        break;
      }
    }
    setRunning(false);
  };

  const stop = () => { stopRef.current = true; };

  const total = stats?.total ?? 0;
  const done = stats?.done ?? 0;
  const pending = stats?.pending ?? 0;
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Media backfill</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Downloads legacy WordPress images from <code>everything-pr.com/wp-content/uploads/…</code> and
          stores them in Supabase Storage (bucket <code>wp-media</code>), then rewrites <code>media.url</code>.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progress</span>
          <button onClick={refresh} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>
        <Progress value={pct} />
        <div className="grid grid-cols-3 gap-2 text-sm">
          <Stat label="Total legacy" value={total} />
          <Stat label="In Storage" value={done} />
          <Stat label="Remaining" value={pending} />
        </div>

        <div className="flex items-center gap-2 pt-2 border-t">
          <label className="text-xs text-muted-foreground">Batch size</label>
          <input
            type="number" min={1} max={50} value={batchSize}
            onChange={(e) => setBatchSize(Math.max(1, Math.min(50, Number(e.target.value) || 10)))}
            disabled={running}
            className="w-20 rounded border px-2 py-1 text-sm"
          />
          {!running ? (
            <button onClick={start} disabled={pending === 0}
              className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              <Play className="h-4 w-4" /> Start
            </button>
          ) : (
            <button onClick={stop}
              className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100">
              <Square className="h-4 w-4" /> Stop
            </button>
          )}
          {running && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {(counters.uploaded || counters.failed || counters.skipped) ? (
          <div className="text-xs text-muted-foreground border-t pt-2">
            This run: <strong className="text-foreground">{counters.uploaded}</strong> uploaded ·{" "}
            <strong className="text-foreground">{counters.failed}</strong> failed ·{" "}
            <strong className="text-foreground">{counters.skipped}</strong> skipped
          </div>
        ) : null}
      </div>

      {recentErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs">
          <div className="font-medium text-red-800 mb-1">Recent errors</div>
          <ul className="space-y-1 text-red-700">
            {recentErrors.map((e, i) => (
              <li key={i} className="truncate"><code>#{e.id}</code> — {e.error} — <span className="opacity-70">{e.url}</span></li>
            ))}
          </ul>
        </div>
      )}

      {log.length > 0 && (
        <div className="rounded-lg border bg-white p-3">
          <div className="text-xs font-medium mb-2">Activity log</div>
          <pre className="text-[11px] leading-relaxed text-muted-foreground max-h-64 overflow-auto whitespace-pre-wrap">
{log.join("\n")}
          </pre>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border bg-muted/30 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}
