import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Search, Trash2, X, Image as ImageIcon, Loader2, Copy } from "lucide-react";
import { listMediaAdmin, updateMedia, deleteMedia } from "@/serverFns/admin-taxonomy.functions";
import { uploadMediaFromBase64 } from "@/serverFns/admin-editor.functions";

export const Route = createFileRoute("/admin/_protected/media")({
  component: MediaLibrary,
});

type Item = {
  id: number; url: string; alt_text: string | null; caption: string | null; title: string | null;
  filename: string | null; mime_type: string | null; width: number | null; height: number | null;
  filesize: number | null; uploaded_at: string | null; created_at: string;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => { const s = String(r.result ?? ""); const i = s.indexOf("base64,"); resolve(i >= 0 ? s.slice(i + 7) : s); };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function fmtBytes(n: number | null) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

const PAGE_SIZE = 48;

function MediaLibrary() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "image" | "video" | "other">("all");
  const [selected, setSelected] = useState<Item | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editAlt, setEditAlt] = useState(""); const [editCaption, setEditCaption] = useState(""); const [editTitle, setEditTitle] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await listMediaAdmin({ data: { page, pageSize: PAGE_SIZE, q, type } });
      setItems(r.items as any); setTotal(r.total);
    } catch (e: any) { toast.error(e?.message ?? "Failed to load media"); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [page, q, type]);

  useEffect(() => {
    if (selected) { setEditAlt(selected.alt_text ?? ""); setEditCaption(selected.caption ?? ""); setEditTitle(selected.title ?? ""); }
  }, [selected]);

  const upload = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading(true);
    let ok = 0;
    for (const f of list) {
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name}: max 10MB`); continue; }
      try {
        const data_base64 = await fileToBase64(f);
        await uploadMediaFromBase64({
          data: { filename: f.name, mime_type: f.type || "application/octet-stream", data_base64 },
        });
        ok++;
      } catch (e: any) { toast.error(`${f.name}: ${e?.message ?? "upload failed"}`); }
    }
    setUploading(false);
    if (ok) { toast.success(`Uploaded ${ok}`); setPage(1); refresh(); }
  };

  const saveMeta = async () => {
    if (!selected) return;
    setSavingMeta(true);
    try {
      await updateMedia({ data: { id: selected.id, alt_text: editAlt, caption: editCaption, title: editTitle } });
      toast.success("Saved");
      setItems((prev) => prev.map((i) => i.id === selected.id ? { ...i, alt_text: editAlt, caption: editCaption, title: editTitle } : i));
      setSelected({ ...selected, alt_text: editAlt, caption: editCaption, title: editTitle });
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
    finally { setSavingMeta(false); }
  };

  const remove = async (it: Item) => {
    if (!window.confirm(`Delete "${it.filename ?? it.id}"? Posts using it will lose the featured image.`)) return;
    try {
      await deleteMedia({ data: { id: it.id } });
      toast.success("Deleted");
      setSelected(null);
      setItems((prev) => prev.filter((i) => i.id !== it.id));
    } catch (e: any) { toast.error(e?.message ?? "Delete failed"); }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Media library</h1>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden"
            onChange={(e) => { if (e.target.files) upload(e.target.files); e.currentTarget.value = ""; }} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-white border p-3 flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="search" placeholder="Search filename, alt, title, caption…"
            value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }}
            className="w-full border rounded pl-8 pr-3 py-1.5 text-sm" />
        </div>
        <select value={type} onChange={(e) => { setPage(1); setType(e.target.value as any); }}
          className="border rounded px-2 py-1.5 text-sm">
          <option value="all">All types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="other">Other</option>
        </select>
        <span className="text-xs text-muted-foreground ml-auto">{total.toLocaleString()} files</span>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) upload(e.dataTransfer.files); }}
        className="rounded-lg bg-white border p-3"
      >
        {loading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No media yet. Drop files here or click Upload.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {items.map((m) => (
              <button key={m.id} onClick={() => setSelected(m)}
                className="group relative aspect-square overflow-hidden rounded border bg-neutral-100 hover:ring-2 hover:ring-primary"
                title={m.filename ?? ""}>
                {m.mime_type?.startsWith("image/") ? (
                  <img src={m.url} alt={m.alt_text ?? ""} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-xs text-muted-foreground p-1 break-all">
                    {(m.mime_type ?? "file").split("/")[0]}
                    <span className="opacity-50 mt-1 text-center">{m.filename?.slice(0, 24)}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
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

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md h-full bg-background shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="font-semibold truncate">{selected.filename ?? `#${selected.id}`}</div>
              <button onClick={() => setSelected(null)} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {selected.mime_type?.startsWith("image/") ? (
                <img src={selected.url} alt={selected.alt_text ?? ""} className="w-full rounded border" />
              ) : (
                <div className="aspect-video rounded border bg-muted flex items-center justify-center text-sm text-muted-foreground">
                  {selected.mime_type}
                </div>
              )}
              <dl className="text-xs grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
                <dt>Type</dt><dd className="text-foreground">{selected.mime_type ?? "—"}</dd>
                <dt>Dimensions</dt><dd className="text-foreground">{selected.width && selected.height ? `${selected.width}×${selected.height}` : "—"}</dd>
                <dt>Size</dt><dd className="text-foreground">{fmtBytes(selected.filesize)}</dd>
                <dt>Uploaded</dt><dd className="text-foreground">{new Date(selected.uploaded_at ?? selected.created_at).toLocaleString()}</dd>
              </dl>

              <div>
                <label className="block text-xs font-medium mb-1">URL</label>
                <div className="flex items-center gap-1">
                  <input readOnly value={selected.url} className="flex-1 rounded border px-2 py-1 text-xs bg-muted/30" />
                  <button onClick={() => { navigator.clipboard.writeText(selected.url); toast.success("Copied"); }}
                    className="rounded border p-1.5 hover:bg-muted" title="Copy URL"><Copy className="h-3.5 w-3.5" /></button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Alt text</label>
                <input value={editAlt} onChange={(e) => setEditAlt(e.target.value)}
                  className="w-full rounded border px-3 py-1.5 text-sm" placeholder="Describe the image for screen readers / SEO" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Title</label>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded border px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Caption</label>
                <textarea value={editCaption} onChange={(e) => setEditCaption(e.target.value)} rows={3}
                  className="w-full rounded border px-3 py-1.5 text-sm" />
              </div>
            </div>
            <div className="border-t px-4 py-3 flex items-center justify-between">
              <button onClick={() => remove(selected)}
                className="inline-flex items-center gap-1 rounded border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
              <button onClick={saveMeta} disabled={savingMeta}
                className="rounded bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {savingMeta ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
