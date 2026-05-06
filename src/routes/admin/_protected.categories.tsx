import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X, Loader2 } from "lucide-react";
import { listCategories, saveCategory, deleteCategory } from "@/serverFns/admin-taxonomy.functions";

export const Route = createFileRoute("/admin/_protected/categories")({
  component: CategoriesPage,
});

type Cat = {
  id: number; name: string; slug: string; description: string | null;
  parent_id: number | null; post_count: number;
  seo_title?: string | null; seo_description?: string | null;
  canonical_url?: string | null; robots?: string | null;
  og_image?: string | null; focus_keyword?: string | null;
};

function CategoriesPage() {
  const [items, setItems] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Cat> | null>(null);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  const refresh = async () => {
    setLoading(true);
    try { const r = await listCategories(); setItems(r.items as any); }
    catch (e: any) { toast.error(e?.message ?? "Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const save = async () => {
    if (!editing?.name?.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      await saveCategory({ data: {
        id: editing.id ?? null, name: editing.name, slug: editing.slug ?? "",
        description: editing.description ?? null, parent_id: editing.parent_id ?? null,
        seo_title: editing.seo_title ?? null,
        seo_description: editing.seo_description ?? null,
        canonical_url: editing.canonical_url ?? null,
        robots: editing.robots ?? null,
        og_image: editing.og_image ?? null,
        focus_keyword: editing.focus_keyword ?? null,
      } });
      toast.success("Saved"); setEditing(null); refresh();
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };

  const remove = async (c: Cat) => {
    if (!window.confirm(`Delete "${c.name}"? Posts will lose this category.`)) return;
    try { await deleteCategory({ data: { id: c.id } }); toast.success("Deleted"); refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Delete failed"); }
  };

  const filtered = q ? items.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.slug.includes(q.toLowerCase())) : items;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Categories</h1>
        <button onClick={() => setEditing({ id: undefined, name: "", slug: "", description: "", parent_id: null })}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New category
        </button>
      </div>

      <div className="rounded-lg bg-white border p-3 mb-3">
        <input type="search" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)}
          className="w-full max-w-sm border rounded px-3 py-1.5 text-sm" />
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
              : filtered.length === 0 ? <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No categories.</td></tr>
              : filtered.map((c) => (
                <tr key={c.id} className="border-t hover:bg-admin-hover">
                  <td className="px-3 py-2 font-medium">{c.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">/{c.slug}/</td>
                  <td className="px-3 py-2 text-muted-foreground truncate max-w-md">{c.description ?? "—"}</td>
                  <td className="px-3 py-2">{c.post_count}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setEditing(c)} className="rounded p-1 hover:bg-muted text-muted-foreground" title="Edit"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(c)} className="rounded p-1 hover:bg-red-50 text-red-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditing(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="font-semibold">{editing.id ? "Edit category" : "New category"}</div>
              <button onClick={() => setEditing(null)} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className="block text-xs font-medium mb-1">Name</label>
                <input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full rounded border px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Slug <span className="text-muted-foreground">(auto if empty)</span></label>
                <input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  className="w-full rounded border px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Parent</label>
                <select value={editing.parent_id ?? ""} onChange={(e) => setEditing({ ...editing, parent_id: e.target.value ? Number(e.target.value) : null })}
                  className="w-full rounded border px-3 py-1.5 text-sm">
                  <option value="">— None —</option>
                  {items.filter((c) => c.id !== editing.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Description <span className="text-muted-foreground">(shown on archive page)</span></label>
                <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={3} className="w-full rounded border px-3 py-1.5 text-sm" />
              </div>

              <div className="border-t pt-3 mt-2">
                <h3 className="text-sm font-semibold mb-3">SEO</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Focus keyword</label>
                    <input value={editing.focus_keyword ?? ""} onChange={(e) => setEditing({ ...editing, focus_keyword: e.target.value })}
                      placeholder="e.g. cybersecurity PR" className="w-full rounded border px-3 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Meta title <span className="text-muted-foreground">({(editing.seo_title ?? "").length}/60)</span>
                    </label>
                    <input value={editing.seo_title ?? ""} onChange={(e) => setEditing({ ...editing, seo_title: e.target.value })}
                      placeholder={editing.name ?? ""} className="w-full rounded border px-3 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Meta description <span className={`${(editing.seo_description ?? "").length > 160 ? "text-red-600" : "text-muted-foreground"}`}>({(editing.seo_description ?? "").length}/160)</span>
                    </label>
                    <textarea value={editing.seo_description ?? ""} onChange={(e) => setEditing({ ...editing, seo_description: e.target.value })}
                      rows={2} placeholder={editing.description ?? ""} className="w-full rounded border px-3 py-1.5 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Canonical URL</label>
                      <input value={editing.canonical_url ?? ""} onChange={(e) => setEditing({ ...editing, canonical_url: e.target.value })}
                        placeholder="(auto)" className="w-full rounded border px-3 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Robots</label>
                      <select value={editing.robots ?? ""} onChange={(e) => setEditing({ ...editing, robots: e.target.value || null })}
                        className="w-full rounded border px-3 py-1.5 text-sm">
                        <option value="">— default —</option>
                        <option value="index,follow">index, follow</option>
                        <option value="index,nofollow">index, nofollow</option>
                        <option value="noindex,follow">noindex, follow</option>
                        <option value="noindex,nofollow">noindex, nofollow</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">OG image URL <span className="text-muted-foreground">(social sharing)</span></label>
                    <input value={editing.og_image ?? ""} onChange={(e) => setEditing({ ...editing, og_image: e.target.value })}
                      placeholder="https://…/image.jpg" className="w-full rounded border px-3 py-1.5 text-sm" />
                  </div>
                </div>
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
