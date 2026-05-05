import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X, Loader2 } from "lucide-react";
import { listRedirects, saveRedirect, deleteRedirect, toggleRedirect } from "@/serverFns/admin-taxonomy.functions";

export const Route = createFileRoute("/admin/_protected/redirects")({
  component: RedirectsPage,
});

type Redirect = {
  id: number; source_path: string; target_path: string; status_code: number;
  is_regex: boolean; enabled: boolean; hits: number; last_hit_at: string | null; notes: string | null;
};

const PAGE_SIZE = 50;

function RedirectsPage() {
  const [items, setItems] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Redirect> | null>(null);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [enabledOnly, setEnabledOnly] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await listRedirects({ data: { page, pageSize: PAGE_SIZE, q, enabledOnly } });
      setItems(r.items as any); setTotal(r.total);
    } catch (e: any) { toast.error(e?.message ?? "Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [page, q, enabledOnly]);

  const save = async () => {
    if (!editing?.source_path?.trim() || !editing?.target_path?.trim()) {
      toast.error("Source and target are required"); return;
    }
    setSaving(true);
    try {
      await saveRedirect({ data: {
        id: editing.id ?? null,
        source_path: editing.source_path, target_path: editing.target_path,
        status_code: editing.status_code ?? 301,
        is_regex: editing.is_regex ?? false,
        enabled: editing.enabled ?? true,
        notes: editing.notes ?? null,
      } });
      toast.success("Saved"); setEditing(null); refresh();
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };

  const remove = async (r: Redirect) => {
    if (!window.confirm(`Delete redirect ${r.source_path} → ${r.target_path}?`)) return;
    try { await deleteRedirect({ data: { id: r.id } }); toast.success("Deleted"); refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Delete failed"); }
  };

  const toggle = async (r: Redirect) => {
    try {
      await toggleRedirect({ data: { id: r.id, enabled: !r.enabled } });
      setItems((prev) => prev.map((x) => x.id === r.id ? { ...x, enabled: !r.enabled } : x));
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Redirects</h1>
        <button onClick={() => setEditing({ id: undefined, source_path: "", target_path: "", status_code: 301, is_regex: false, enabled: true })}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New redirect
        </button>
      </div>

      <div className="rounded-lg bg-white border p-3 flex flex-wrap items-center gap-3 mb-3">
        <input type="search" placeholder="Search source/target/notes…" value={q}
          onChange={(e) => { setPage(1); setQ(e.target.value); }}
          className="flex-1 min-w-[200px] border rounded px-3 py-1.5 text-sm" />
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={enabledOnly} onChange={(e) => { setPage(1); setEnabledOnly(e.target.checked); }} />
          Enabled only
        </label>
        <span className="text-xs text-muted-foreground">{total.toLocaleString()} total</span>
      </div>

      <div className="rounded-lg bg-white border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-3 w-16">On</th>
              <th className="px-3 py-3">Source</th><th className="px-3 py-3">Target</th>
              <th className="px-3 py-3 w-16">Code</th><th className="px-3 py-3 w-20">Hits</th>
              <th className="px-3 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Loading…</td></tr>
              : items.length === 0 ? <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No redirects.</td></tr>
              : items.map((r) => (
                <tr key={r.id} className={`border-t hover:bg-admin-hover ${!r.enabled ? "opacity-60" : ""}`}>
                  <td className="px-3 py-2">
                    <button onClick={() => toggle(r)}
                      className={`relative h-5 w-9 rounded-full transition-colors ${r.enabled ? "bg-primary" : "bg-neutral-300"}`}
                      title={r.enabled ? "Disable" : "Enable"}>
                      <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${r.enabled ? "translate-x-4" : ""}`} />
                    </button>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs break-all">
                    {r.source_path}
                    {r.is_regex && <span className="ml-1 inline-block rounded bg-purple-100 text-purple-800 px-1 text-[10px] uppercase">re</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs break-all text-muted-foreground">→ {r.target_path}</td>
                  <td className="px-3 py-2"><span className="inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-xs">{r.status_code}</span></td>
                  <td className="px-3 py-2">{r.hits}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setEditing(r)} className="rounded p-1 hover:bg-muted text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(r)} className="rounded p-1 hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
        <div>page {page} of {totalPages}</div>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="rounded border bg-white px-3 py-1.5 disabled:opacity-50">Previous</button>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
            className="rounded border bg-white px-3 py-1.5 disabled:opacity-50">Next</button>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-lg bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="font-semibold">{editing.id ? "Edit redirect" : "New redirect"}</div>
              <button onClick={() => setEditing(null)} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className="block text-xs font-medium mb-1">Source path</label>
                <input value={editing.source_path ?? ""} onChange={(e) => setEditing({ ...editing, source_path: e.target.value })}
                  placeholder="/old-url/" className="w-full rounded border px-3 py-1.5 text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Target path</label>
                <input value={editing.target_path ?? ""} onChange={(e) => setEditing({ ...editing, target_path: e.target.value })}
                  placeholder="/new-url/  or  https://example.com/" className="w-full rounded border px-3 py-1.5 text-sm font-mono" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Status</label>
                  <select value={editing.status_code ?? 301} onChange={(e) => setEditing({ ...editing, status_code: Number(e.target.value) })}
                    className="w-full rounded border px-2 py-1.5 text-sm">
                    <option value={301}>301 permanent</option>
                    <option value={302}>302 temporary</option>
                    <option value={307}>307 temporary (preserve method)</option>
                    <option value={308}>308 permanent (preserve method)</option>
                  </select>
                </div>
                <label className="flex items-end gap-2 text-sm pb-1.5">
                  <input type="checkbox" checked={editing.is_regex ?? false}
                    onChange={(e) => setEditing({ ...editing, is_regex: e.target.checked })} />
                  Regex
                </label>
                <label className="flex items-end gap-2 text-sm pb-1.5">
                  <input type="checkbox" checked={editing.enabled ?? true}
                    onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })} />
                  Enabled
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Notes</label>
                <textarea value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  rows={2} className="w-full rounded border px-3 py-1.5 text-sm" />
              </div>
            </div>
            <div className="border-t px-4 py-3 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded border px-3 py-1.5 text-sm hover:bg-muted">Cancel</button>
              <button onClick={save} disabled={saving}
                className="rounded bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
