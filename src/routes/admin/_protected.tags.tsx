import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X, Loader2 } from "lucide-react";
import { listTags, saveTag, deleteTag } from "@/serverFns/admin-taxonomy.functions";

export const Route = createFileRoute("/admin/_protected/tags")({
  component: TagsPage,
});

type Tag = { id: number; name: string; slug: string; description: string | null; post_count: number };

function TagsPage() {
  const [items, setItems] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Tag> | null>(null);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  const refresh = async () => {
    setLoading(true);
    try { const r = await listTags(); setItems(r.items as any); }
    catch (e: any) { toast.error(e?.message ?? "Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const save = async () => {
    if (!editing?.name?.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      await saveTag({ data: { id: editing.id ?? null, name: editing.name, slug: editing.slug ?? "", description: editing.description ?? null } });
      toast.success("Saved"); setEditing(null); refresh();
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };

  const remove = async (t: Tag) => {
    if (!window.confirm(`Delete tag "${t.name}"?`)) return;
    try { await deleteTag({ data: { id: t.id } }); toast.success("Deleted"); refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Delete failed"); }
  };

  const filtered = q ? items.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.slug.includes(q.toLowerCase())) : items;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Tags</h1>
        <button onClick={() => setEditing({ id: undefined, name: "", slug: "", description: "" })}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New tag
        </button>
      </div>

      <div className="rounded-lg bg-white border p-3 mb-3">
        <input type="search" placeholder="Search tags…" value={q} onChange={(e) => setQ(e.target.value)}
          className="w-full max-w-sm border rounded px-3 py-1.5 text-sm" />
        <span className="ml-3 text-xs text-muted-foreground">{filtered.length.toLocaleString()} of {items.length.toLocaleString()}</span>
      </div>

      <div className="rounded-lg bg-white border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-white">
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-3">Name</th><th className="px-3 py-3">Slug</th>
              <th className="px-3 py-3">Description</th><th className="px-3 py-3 w-20">Posts</th>
              <th className="px-3 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Loading…</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No tags.</td></tr>
              : filtered.map((t) => (
                <tr key={t.id} className="border-t hover:bg-admin-hover">
                  <td className="px-3 py-2 font-medium">{t.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">/{t.slug}/</td>
                  <td className="px-3 py-2 text-muted-foreground truncate max-w-md">{t.description ?? "—"}</td>
                  <td className="px-3 py-2">{t.post_count}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setEditing(t)} className="rounded p-1 hover:bg-muted text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(t)} className="rounded p-1 hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-lg bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="font-semibold">{editing.id ? "Edit tag" : "New tag"}</div>
              <button onClick={() => setEditing(null)} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className="block text-xs font-medium mb-1">Name</label>
                <input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full rounded border px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Slug</label>
                <input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  className="w-full rounded border px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Description</label>
                <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={3} className="w-full rounded border px-3 py-1.5 text-sm" />
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
