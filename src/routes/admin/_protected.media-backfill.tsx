import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Play, Square, RefreshCw, Loader2, ListPlus, RotateCcw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  getBackfillStats,
  buildBackfillQueue,
  runBackfillBatch,
  resetFailedBackfill,
  getRewriteStats,
  rewritePostsBatch,
} from "@/serverFns/media-backfill.functions";

export const Route = createFileRoute("/admin/_protected/media-backfill")({
  component: MediaBackfillPage,
});

type Stats = { total: number; pending: number; done: number; failed: number };

function MediaBackfillPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [running, setRunning] = useState(false);
  const [building, setBuilding] = useState(false);
  const [batchSize, setBatchSize] = useState(5);
  const [log, setLog] = useState<string[]>([]);
  const [recentErrors, setRecentErrors] = useState<Array<{ url: string; error: string }>>([]);
  const [rewriteStats, setRewriteStats] = useState<{ remaining: number; remainingInline: number } | null>(null);
  const [rewriting, setRewriting] = useState(false);
  const stopRewriteRef = useRef(false);
  const stopRef = useRef(false);

  const refresh = async () => {
    try {
      setStats((await getBackfillStats()) as Stats);
      setRewriteStats(await getRewriteStats());
    } catch (e: any) { toast.error(e?.message ?? "Failed to load stats"); }
  };

  const startRewrite = async () => {
    if (rewriting) return;
    stopRewriteRef.current = false; setRewriting(true);
    const PARALLEL = 4;
    const BATCH = 80;
    // Independent cursors per worker so they don't fight over the same rows.
    const cursors = Array.from({ length: PARALLEL }, () => 0);
    let totalUpdated = 0;
    let totalProcessed = 0;
    let consecutiveEmpty = 0;
    let tick = 0;

    const runWorker = async (i: number) => {
      let retry = 0;
      while (!stopRewriteRef.current) {
        try {
          const wantCount = (++tick) % 8 === 0;
          const r = await rewritePostsBatch({
            data: { batchSize: BATCH, afterId: cursors[i], withCount: wantCount },
          });
          retry = 0;
          totalUpdated += r.updated;
          totalProcessed += r.processed;
          cursors[i] = r.lastId;
          if (r.processed === 0) {
            // Restart this worker from the beginning so it can pick up rows
            // that other workers couldn't reach (or new ones).
            consecutiveEmpty++;
            cursors[i] = 0;
            if (consecutiveEmpty >= PARALLEL * 2) {
              setLog((l) => [`${new Date().toLocaleTimeString()}  rewrite drained · total updated=${totalUpdated}`, ...l].slice(0, 50));
              stopRewriteRef.current = true;
              break;
            }
          } else {
            consecutiveEmpty = 0;
          }
          if (wantCount) {
            setLog((l) => [`${new Date().toLocaleTimeString()}  rewrite: +${r.updated}/${r.processed} (worker ${i}, lastId=${r.lastId}, remaining=${r.remaining})`, ...l].slice(0, 50));
            await refresh();
          }
        } catch (e: any) {
          retry++;
          const wait = Math.min(15000, 500 * 2 ** retry);
          setLog((l) => [`${new Date().toLocaleTimeString()}  worker ${i} err (retry ${retry} in ${wait}ms): ${e?.message ?? e}`, ...l].slice(0, 50));
          await new Promise((r) => setTimeout(r, wait));
        }
      }
    };

    try {
      await Promise.all(Array.from({ length: PARALLEL }, (_, i) => runWorker(i)));
      toast.success("Posts rewritten");
      await refresh();
    } finally {
      setRewriting(false);
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

  const buildQueue = async () => {
    setBuilding(true);
    try {
      const r = await buildBackfillQueue();
      toast.success(`Queue built: ${r.newly_inserted} new (${r.queued} total referenced URLs)`);
      setLog((l) => [`${new Date().toLocaleTimeString()}  built queue: scanned=${r.scanned_urls}, queued=${r.queued}, new=${r.newly_inserted}`, ...l].slice(0, 50));
      await refresh();
    } catch (e: any) { toast.error(e?.message ?? "Build failed"); }
    finally { setBuilding(false); }
  };

  const start = async () => {
    if (running) return;
    stopRef.current = false; setRunning(true); setRecentErrors([]);
    while (!stopRef.current) {
      try {
        const r = await runBackfillBatch({ data: { batchSize } });
        if (r.errors?.length) setRecentErrors(r.errors);
        setLog((l) => [`${new Date().toLocaleTimeString()}  +${r.uploaded} ok · ${r.failed} fail`, ...l].slice(0, 50));
        await refresh();
        if ((r.processed ?? 0) === 0) { toast.success("Queue drained"); break; }
      } catch (e: any) {
        toast.error(e?.message ?? "Batch failed");
        setLog((l) => [`${new Date().toLocaleTimeString()}  ERROR ${e?.message}`, ...l].slice(0, 50));
        break;
      }
    }
    setRunning(false);
  };

  const stop = () => { stopRef.current = true; };

  const resetFailed = async () => {
    try {
      const r = await resetFailedBackfill();
      toast.success(`Reset ${r.reset} failed → pending`);
      await refresh();
    } catch (e: any) { toast.error(e?.message ?? "Reset failed"); }
  };

  const total = stats?.total ?? 0;
  const done = stats?.done ?? 0;
  const pending = stats?.pending ?? 0;
  const failed = stats?.failed ?? 0;
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Media backfill</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Migrates only the WordPress images actually referenced by your published posts
          (featured + inline) from <code>everything-pr.com/wp-content/uploads/…</code> into Supabase Storage.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <button onClick={buildQueue} disabled={building || running}
            className="inline-flex items-center gap-1 rounded border bg-white px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50">
            {building ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListPlus className="h-4 w-4" />}
            1. Build queue from posts
          </button>
          <span className="text-xs text-muted-foreground">Scans every published post for legacy image URLs (run once or to pick up new posts).</span>
        </div>

        <div className="flex items-center justify-between text-sm pt-2 border-t">
          <span className="font-medium">Progress</span>
          <button onClick={refresh} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>
        <Progress value={pct} />
        <div className="grid grid-cols-4 gap-2 text-sm">
          <Stat label="Queued" value={total} />
          <Stat label="Done" value={done} />
          <Stat label="Pending" value={pending} />
          <Stat label="Failed" value={failed} />
        </div>

        <div className="flex items-center gap-2 pt-2 border-t">
          <label className="text-xs text-muted-foreground">Batch</label>
          <input type="number" min={1} max={10} value={batchSize}
            onChange={(e) => setBatchSize(Math.max(1, Math.min(20, Number(e.target.value) || 8)))}
            disabled={running}
            className="w-20 rounded border px-2 py-1 text-sm" />
          {!running ? (
            <button onClick={start} disabled={pending === 0}
              className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              <Play className="h-4 w-4" /> 2. Start downloading
            </button>
          ) : (
            <button onClick={stop}
              className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100">
              <Square className="h-4 w-4" /> Stop
            </button>
          )}
          {failed > 0 && !running && (
            <button onClick={resetFailed}
              className="ml-auto inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs hover:bg-muted">
              <RotateCcw className="h-3 w-3" /> Retry {failed} failed
            </button>
          )}
          {running && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 space-y-3">
        <div>
          <div className="font-medium text-sm">3. Rewrite posts to use Supabase URLs</div>
          <p className="text-xs text-muted-foreground mt-1">
            Replaces every legacy <code>everything-pr.com/wp-content/uploads/…</code> URL inside post
            content and inline-image fields with the matching Supabase Storage URL.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Stat label="Posts w/ legacy HTML" value={rewriteStats?.remaining ?? 0} />
          <Stat label="Posts w/ legacy inline" value={rewriteStats?.remainingInline ?? 0} />
        </div>
        <div className="flex items-center gap-2">
          {!rewriting ? (
            <button onClick={startRewrite} disabled={(rewriteStats?.remaining ?? 0) + (rewriteStats?.remainingInline ?? 0) === 0}
              className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              <Play className="h-4 w-4" /> Start rewrite
            </button>
          ) : (
            <button onClick={() => { stopRewriteRef.current = true; }}
              className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100">
              <Square className="h-4 w-4" /> Stop
            </button>
          )}
          {rewriting && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      {recentErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs">
          <div className="font-medium text-red-800 mb-1">Recent errors</div>
          <ul className="space-y-1 text-red-700">
            {recentErrors.map((e, i) => (
              <li key={i} className="truncate">{e.error} — <span className="opacity-70">{e.url}</span></li>
            ))}
          </ul>
        </div>
      )}

      {log.length > 0 && (
        <div className="rounded-lg border bg-white p-3">
          <div className="text-xs font-medium mb-2">Activity log</div>
          <pre className="text-[11px] leading-relaxed text-muted-foreground max-h-64 overflow-auto whitespace-pre-wrap">{log.join("\n")}</pre>
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
