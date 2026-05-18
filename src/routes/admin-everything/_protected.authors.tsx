import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X, Loader2, ExternalLink, Upload } from "lucide-react";
import { listAuthorsAdmin as listAuthors, saveAuthor, deleteAuthor } from "@/serverFns/admin-taxonomy.functions";
import { uploadMediaFromBase64 } from "@/serverFns/admin-editor.functions";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result ?? "");
      const i = s.indexOf("base64,");
      resolve(i >= 0 ? s.slice(i + 7) : s);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export const Route = createFileRoute("/admin-everything/_protected/authors")({
  component: AuthorsPage,
});

type Social = { linkedin?: string | null; twitter?: string | null; facebook?: string | null; instagram?: string | null };
type Author = {
  id: number; display_name: string; slug: string; email: string | null; bio: string | null;
  website: string | null; avatar_url: string | null; post_count: number; social?: Social | null;
};

function AuthorsPage() {
  const [items, setItems] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Author> | null>(null);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const uploadAvatar = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }
    setUploadingAvatar(true);
    try {
      const data_base64 = await fileToBase64(file);
      const m = await uploadMediaFromBase64({
        data: { filename: file.name, mime_type: file.type || "image/jpeg", data_base64 },
      });
      setEditing((prev) => prev ? { ...prev, avatar_url: (m as any).url } : prev);
      toast.success("Uploaded");
    } catch (e: any) { toast.error(e?.message ?? "Upload failed"); }
    finally { setUploadingAvatar(false); }
  };

  const refresh = async () => {
    setLoading(true);
    try { const r = await listAuthors(); setItems(r.items as any); }
    catch (e: any) { toast.error(e?.message ?? "Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const save = async () => {
    if (!editing?.display_name?.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      await saveAuthor({ data: {
        id: editing.id ?? null, display_name: editing.display_name, slug: editing.slug ?? "",
        email: editing.email ?? null, bio: editing.bio ?? null,
        website: editing.website ?? null, avatar_url: editing.avatar_url ?? null,
        social: editing.social ?? {},
      } });
      toast.success("Saved"); setEditing(null); refresh();
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };

  const remove = async (a: Author) => {
    if (!window.confirm(`Delete "${a.display_name}"? Their posts will be detached (not deleted).`)) return;
    try { await deleteAuthor({ data: { id: a.id } }); toast.success("Deleted"); refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Delete failed"); }
  };

  const filtered = q
    ? items.filter((a) => (a.display_name + " " + (a.email ?? "") + " " + a.slug).toLowerCase().includes(q.toLowerCase()))
    : items;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Authors</h1>
        <button onClick={() => setEditing({ id: undefined, display_name: "", slug: "" })}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New author
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
              <th className="px-3 py-3 w-12"></th><th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Slug</th><th className="px-3 py-3">Email</th>
              <th className="px-3 py-3 w-20">Posts</th><th className="px-3 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Loading…</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No authors.</td></tr>
              : filtered.map((a) => (
                <tr key={a.id} className="border-t hover:bg-admin-hover">
                  <td className="px-3 py-2">
                    {a.avatar_url ? <img src={a.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      : <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-medium">{a.display_name.charAt(0)}</div>}
                  </td>
                  <td className="px-3 py-2 font-medium">{a.display_name}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    <a href={`/author/${a.slug}/`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
                      /author/{a.slug}/ <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{a.email ?? "—"}</td>
                  <td className="px-3 py-2">{a.post_count}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setEditing(a)} className="rounded p-1 hover:bg-muted text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(a)} className="rounded p-1 hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-lg bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="font-semibold">{editing.id ? "Edit author" : "New author"}</div>
              <button onClick={() => setEditing(null)} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Display name</label>
                  <input value={editing.display_name ?? ""} onChange={(e) => setEditing({ ...editing, display_name: e.target.value })}
                    className="w-full rounded border px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Slug</label>
                  <input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                    className="w-full rounded border px-3 py-1.5 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Email</label>
                  <input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                    className="w-full rounded border px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Website</label>
                  <input value={editing.website ?? ""} onChange={(e) => setEditing({ ...editing, website: e.target.value })}
                    placeholder="https://" className="w-full rounded border px-3 py-1.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Avatar</label>
                <div className="flex gap-2">
                  <input value={editing.avatar_url ?? ""} onChange={(e) => setEditing({ ...editing, avatar_url: e.target.value })}
                    placeholder="https://… or upload below" className="flex-1 rounded border px-3 py-1.5 text-sm" />
                  <input ref={avatarFileRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.currentTarget.value = ""; }} />
                  <button type="button" onClick={() => avatarFileRef.current?.click()} disabled={uploadingAvatar}
                    className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50">
                    {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploadingAvatar ? "Uploading…" : "Upload"}
                  </button>
                </div>
                {editing.avatar_url && <img src={editing.avatar_url} alt="" className="mt-2 h-16 w-16 rounded-full object-cover border" />}
              </div>
              <div className="border-t pt-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Social profiles (optional — only shown on the author page when filled in)</div>
                <div className="grid grid-cols-2 gap-3">
                  {(["linkedin", "twitter", "facebook", "instagram"] as const).map((k) => (
                    <div key={k}>
                      <label className="block text-xs font-medium mb-1 capitalize">{k}</label>
                      <input
                        value={(editing.social as Social | undefined)?.[k] ?? ""}
                        onChange={(e) => setEditing({ ...editing, social: { ...(editing.social ?? {}), [k]: e.target.value } })}
                        placeholder="https://"
                        className="w-full rounded border px-3 py-1.5 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Bio</label>
                <textarea value={editing.bio ?? ""} onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
                  rows={4} className="w-full rounded border px-3 py-1.5 text-sm" />
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
