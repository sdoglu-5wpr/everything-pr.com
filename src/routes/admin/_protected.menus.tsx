import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X, Loader2, ChevronRight } from "lucide-react";
import {
  listMenus, saveMenu, deleteMenu, saveMenuItem, deleteMenuItem,
} from "@/serverFns/admin-site.functions";

export const Route = createFileRoute("/admin/_protected/menus")({
  component: MenusPage,
});

type Menu = { id: number; name: string; slug: string; location: string | null };
type MenuItem = {
  id: number; menu_id: number; parent_id: number | null;
  label: string; url: string; target: string | null; rel: string | null;
  position: number; object_type: string | null; object_id: number | null;
};

function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [editingMenu, setEditingMenu] = useState<Partial<Menu> | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await listMenus();
      setMenus(r.menus); setItems(r.items);
      if (!activeId && r.menus.length) setActiveId(r.menus[0].id);
    } catch (e: any) { toast.error(e?.message ?? "Load failed"); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  const activeItems = useMemo(
    () => items.filter((i) => i.menu_id === activeId).sort((a, b) => a.position - b.position),
    [items, activeId]
  );

  const saveMenuFn = async () => {
    if (!editingMenu?.name?.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      await saveMenu({ data: {
        id: editingMenu.id ?? null, name: editingMenu.name,
        slug: editingMenu.slug ?? "", location: editingMenu.location ?? null,
      } });
      toast.success("Saved"); setEditingMenu(null); refresh();
    } catch (e: any) { toast.error(e?.message); }
    finally { setSaving(false); }
  };

  const removeMenu = async (m: Menu) => {
    if (!window.confirm(`Delete menu "${m.name}" and all its items?`)) return;
    try { await deleteMenu({ data: { id: m.id } }); toast.success("Deleted"); setActiveId(null); refresh(); }
    catch (e: any) { toast.error(e?.message); }
  };

  const saveItemFn = async () => {
    if (!editingItem?.label?.trim() || !editingItem?.url?.trim() || !activeId) {
      toast.error("Label and URL required"); return;
    }
    setSaving(true);
    try {
      await saveMenuItem({ data: {
        id: editingItem.id ?? null, menu_id: activeId,
        label: editingItem.label, url: editingItem.url,
        target: editingItem.target ?? null, rel: editingItem.rel ?? null,
        parent_id: editingItem.parent_id ?? null,
        position: editingItem.position ?? activeItems.length,
      } });
      toast.success("Saved"); setEditingItem(null); refresh();
    } catch (e: any) { toast.error(e?.message); }
    finally { setSaving(false); }
  };

  const removeItem = async (i: MenuItem) => {
    if (!window.confirm(`Delete "${i.label}"?`)) return;
    try { await deleteMenuItem({ data: { id: i.id } }); toast.success("Deleted"); refresh(); }
    catch (e: any) { toast.error(e?.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Menus</h1>
        <button onClick={() => setEditingMenu({ id: undefined, name: "", slug: "", location: "" })}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New menu
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-3 rounded-lg bg-white border overflow-hidden">
          <div className="px-3 py-2 border-b text-xs uppercase tracking-wide text-muted-foreground">Menus</div>
          {loading ? <div className="p-4 text-sm text-muted-foreground">Loading…</div>
            : menus.length === 0 ? <div className="p-4 text-sm text-muted-foreground">No menus yet.</div>
            : menus.map((m) => (
              <button key={m.id} onClick={() => setActiveId(m.id)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-admin-hover flex items-center justify-between ${activeId === m.id ? "bg-admin-active" : ""}`}>
                <div>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.location || m.slug}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
        </div>

        <div className="col-span-9 rounded-lg bg-white border overflow-hidden">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <div className="font-semibold">
              {menus.find((m) => m.id === activeId)?.name || "Select a menu"}
            </div>
            {activeId && (
              <div className="flex gap-2">
                <button onClick={() => { const m = menus.find((x) => x.id === activeId)!; setEditingMenu({ ...m }); }}
                  className="rounded border px-3 py-1.5 text-sm hover:bg-muted">Rename</button>
                <button onClick={() => removeMenu(menus.find((x) => x.id === activeId)!)}
                  className="rounded border px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">Delete menu</button>
                <button onClick={() => setEditingItem({ id: undefined, label: "", url: "", target: "_self" })}
                  className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1">
                  <Plus className="h-4 w-4" /> Add item
                </button>
              </div>
            )}
          </div>

          {!activeId ? <div className="p-8 text-center text-sm text-muted-foreground">No menu selected</div>
            : activeItems.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No items.</div>
            : (
              <table className="w-full text-sm">
                <thead className="border-b bg-admin-surface-2">
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 w-12">#</th>
                    <th className="px-3 py-2">Label</th>
                    <th className="px-3 py-2">URL</th>
                    <th className="px-3 py-2 w-20">Target</th>
                    <th className="px-3 py-2 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {activeItems.map((i) => (
                    <tr key={i.id} className="border-t hover:bg-admin-hover">
                      <td className="px-3 py-2 text-muted-foreground">{i.position}</td>
                      <td className="px-3 py-2 font-medium">{i.label}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground break-all">{i.url}</td>
                      <td className="px-3 py-2 text-xs">{i.target || "_self"}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => setEditingItem(i)} className="rounded p-1 hover:bg-muted text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => removeItem(i)} className="rounded p-1 hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>

      {editingMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingMenu(null)}>
          <div className="w-full max-w-md rounded-lg bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="font-semibold">{editingMenu.id ? "Edit menu" : "New menu"}</div>
              <button onClick={() => setEditingMenu(null)} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className="block text-xs font-medium mb-1">Name</label>
                <input value={editingMenu.name ?? ""} onChange={(e) => setEditingMenu({ ...editingMenu, name: e.target.value })}
                  className="w-full rounded border px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Slug (optional)</label>
                <input value={editingMenu.slug ?? ""} onChange={(e) => setEditingMenu({ ...editingMenu, slug: e.target.value })}
                  className="w-full rounded border px-3 py-1.5 text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Location (e.g. header, footer)</label>
                <input value={editingMenu.location ?? ""} onChange={(e) => setEditingMenu({ ...editingMenu, location: e.target.value })}
                  className="w-full rounded border px-3 py-1.5 text-sm" />
              </div>
            </div>
            <div className="border-t px-4 py-3 flex justify-end gap-2">
              <button onClick={() => setEditingMenu(null)} className="rounded border px-3 py-1.5 text-sm hover:bg-muted">Cancel</button>
              <button onClick={saveMenuFn} disabled={saving}
                className="rounded bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingItem(null)}>
          <div className="w-full max-w-md rounded-lg bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="font-semibold">{editingItem.id ? "Edit item" : "Add item"}</div>
              <button onClick={() => setEditingItem(null)} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className="block text-xs font-medium mb-1">Label</label>
                <input value={editingItem.label ?? ""} onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
                  className="w-full rounded border px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">URL</label>
                <input value={editingItem.url ?? ""} onChange={(e) => setEditingItem({ ...editingItem, url: e.target.value })}
                  placeholder="/about or https://example.com" className="w-full rounded border px-3 py-1.5 text-sm font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Target</label>
                  <select value={editingItem.target ?? "_self"} onChange={(e) => setEditingItem({ ...editingItem, target: e.target.value })}
                    className="w-full rounded border px-2 py-1.5 text-sm">
                    <option value="_self">Same tab</option>
                    <option value="_blank">New tab</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Position</label>
                  <input type="number" value={editingItem.position ?? 0}
                    onChange={(e) => setEditingItem({ ...editingItem, position: Number(e.target.value) })}
                    className="w-full rounded border px-3 py-1.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Rel</label>
                <input value={editingItem.rel ?? ""} onChange={(e) => setEditingItem({ ...editingItem, rel: e.target.value })}
                  placeholder="nofollow, noopener…" className="w-full rounded border px-3 py-1.5 text-sm" />
              </div>
            </div>
            <div className="border-t px-4 py-3 flex justify-end gap-2">
              <button onClick={() => setEditingItem(null)} className="rounded border px-3 py-1.5 text-sm hover:bg-muted">Cancel</button>
              <button onClick={saveItemFn} disabled={saving}
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
