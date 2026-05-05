import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  startImportJob,
  tickImportJob,
  getImportJob,
  cancelImportJob,
  getLatestImportJob,
  resumeImportJob,
} from "@/serverFns/wp-import.functions";

export const Route = createFileRoute("/admin/_protected/import")({
  component: ImportPage,
});

type Job = {
  id: string;
  status: string;
  phase: string;
  page: number;
  per_page: number;
  download_media: boolean;
  totals: Record<string, number>;
  inserted: Record<string, number>;
  skipped: Record<string, number>;
  errors: Array<{ phase: string; message: string }>;
  last_message: string | null;
  created_at: string;
  completed_at: string | null;
};

function ImportPage() {
  const [job, setJob] = useState<Job | null>(null);
  const [downloadMedia, setDownloadMedia] = useState(true);
  const [perPage, setPerPage] = useState(20);
  const [busy, setBusy] = useState(false);
  const tickingRef = useRef(false);

  // Load latest job on mount so we can resume after a page reload
  useEffect(() => {
    (async () => {
      try {
        const r = await getLatestImportJob();
        if (r.ok && r.job) setJob(r.job as unknown as Job);
      } catch (e) { console.error("load latest job failed", e); }
    })();
  }, []);

  // Auto-tick loop when running
  useEffect(() => {
    if (!job || tickingRef.current) return;
    if (job.status !== "pending" && job.status !== "running") return;
    tickingRef.current = true;
    let cancelled = false;
    (async () => {
      while (!cancelled) {
        try {
          const res = await tickImportJob({ data: { jobId: job.id } });
          if (!res.ok) {
            toast.error(`Import error: ${res.error}`);
            break;
          }
          if (res.job) {
            setJob(res.job as unknown as Job);
            if (res.job.status === "completed") { toast.success("Import complete"); break; }
            if (res.job.status === "failed" || res.job.status === "cancelled") break;
          }
          await new Promise((r) => setTimeout(r, 400));
        } catch (e: any) {
          toast.error(e?.message ?? "tick failed");
          break;
        }
      }
      tickingRef.current = false;
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id]);

  const start = async () => {
    setBusy(true);
    try {
      const res = await startImportJob({ data: { downloadMedia, perPage } });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Import started");
      const j = await getImportJob({ data: { jobId: res.jobId } });
      if (j.ok) setJob(j.job as unknown as Job);
      else toast.error(j.error);
    } catch (e: any) {
      console.error("start import failed", e);
      toast.error(e?.message ?? "Failed to start import");
    } finally { setBusy(false); }
  };

  const cancel = async () => {
    if (!job) return;
    await cancelImportJob({ data: { jobId: job.id } });
    const j = await getImportJob({ data: { jobId: job.id } });
    if (j.ok) setJob(j.job as unknown as Job);
  };

  const resume = async () => {
    if (!job) return;
    setBusy(true);
    try {
      const r = await resumeImportJob({ data: { jobId: job.id, perPage } });
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Resuming import");
      setJob(r.job as unknown as Job);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-serif text-2xl font-bold">Import from WordPress</h1>
        <p className="text-sm text-muted-foreground">
          Pulls authors, categories, tags, media and posts from your old WordPress site via REST API.
          Only items missing from the database are inserted — safe to re-run.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={downloadMedia} onChange={(e) => setDownloadMedia(e.target.checked)} />
          Download images to Supabase Storage (recommended)
        </label>
        <label className="flex items-center gap-2 text-sm">
          Items per batch:
          <input
            type="number" min={5} max={50} value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value) || 20)}
            className="w-20 rounded border px-2 py-1"
          />
        </label>
        <div className="flex gap-2">
          <button
            onClick={start}
            disabled={busy || (job?.status === "running" || job?.status === "pending")}
            className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Starting…" : "Start import"}
          </button>
          {job && (job.status === "running" || job.status === "pending") && (
            <button onClick={cancel} className="rounded border px-4 py-2 text-sm hover:bg-muted">
              Cancel
            </button>
          )}
          {job && (job.status === "failed" || job.status === "cancelled" || (job.status === "running" && !tickingRef.current)) && job.phase !== "done" && (
            <button onClick={resume} disabled={busy} className="rounded border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">
              Resume {job.phase} (page {job.page})
            </button>
          )}
        </div>
      </div>

      {job && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              Status: <span className="font-semibold">{job.status}</span> · Phase:{" "}
              <span className="font-semibold">{job.phase}</span> · Page {job.page}
            </div>
            <div className="text-xs text-muted-foreground">{job.id.slice(0, 8)}</div>
          </div>
          {job.last_message && (
            <div className="text-xs text-muted-foreground">{job.last_message}</div>
          )}
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="py-1">Type</th><th>Total on WP</th><th>Inserted</th><th>Skipped (already had)</th></tr>
            </thead>
            <tbody>
              {["authors", "categories", "tags", "media", "posts", "pages"].map((k) => (
                <tr key={k} className="border-t">
                  <td className="py-1.5 capitalize">{k}</td>
                  <td>{job.totals?.[k] ?? "—"}</td>
                  <td className="text-emerald-600">+{job.inserted?.[k] ?? 0}</td>
                  <td className="text-muted-foreground">{job.skipped?.[k] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {job.errors?.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-destructive">
                {job.errors.length} error{job.errors.length === 1 ? "" : "s"}
              </summary>
              <ul className="mt-2 max-h-60 overflow-auto rounded border bg-muted/30 p-2 text-xs">
                {job.errors.slice(-50).map((e, i) => (
                  <li key={i}><span className="font-mono">[{e.phase}]</span> {e.message}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
