import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listActivity } from "@/serverFns/admin-site.functions";

export const Route = createFileRoute("/admin/_protected/activity")({
  component: ActivityPage,
});

type Row = {
  id: number; action: string; table_name: string; row_id: string | null;
  actor_id: string | null; occurred_at: string; diff: any;
};

const PAGE_SIZE = 50;

function ActivityPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [table, setTable] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Row | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await listActivity({ data: { page, pageSize: PAGE_SIZE, table: table || null } });
      setRows(r.items); setTotal(r.total);
    } catch (e: any) { toast.error(e?.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [page, table]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold mb-4">Activity log</h1>

      <div className="rounded-lg bg-white border p-3 mb-3 flex items-center gap-3">
        <input value={table} onChange={(e) => { setPage(1); setTable(e.target.value); }}
          placeholder="Filter by table (e.g. posts)" className="flex-1 rounded border px-3 py-1.5 text-sm" />
        <span className="text-xs text-muted-foreground">{total.toLocaleString()} entries</span>
      </div>

      <div className="rounded-lg bg-white border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-admin-surface-2">
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 w-44">When</th>
              <th className="px-3 py-2 w-24">Action</th>
              <th className="px-3 py-2 w-32">Table</th>
              <th className="px-3 py-2 w-32">Row</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Loading…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No activity.</td></tr>
              : rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-admin-hover">
                  <td className="px-3 py-2 text-xs">{new Date(r.occurred_at).toLocaleString()}</td>
                  <td className="px-3 py-2"><span className="inline-block rounded bg-neutral-100 px-1.5 text-xs">{r.action}</span></td>
                  <td className="px-3 py-2 font-mono text-xs">{r.table_name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.row_id}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.actor_id?.slice(0, 8) ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    {r.diff && <button onClick={() => setOpen(r)} className="text-xs text-primary hover:underline">View</button>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
        <div>page {page} of {totalPages}</div>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border bg-white px-3 py-1.5 disabled:opacity-50">Previous</button>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded border bg-white px-3 py-1.5 disabled:opacity-50">Next</button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(null)}>
          <div className="w-full max-w-2xl rounded-lg bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-4 py-3 font-semibold">Diff — {open.table_name} #{open.row_id}</div>
            <pre className="p-4 text-xs font-mono overflow-auto max-h-[60vh]">{JSON.stringify(open.diff, null, 2)}</pre>
            <div className="border-t px-4 py-3 flex justify-end">
              <button onClick={() => setOpen(null)} className="rounded border px-3 py-1.5 text-sm hover:bg-muted">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
