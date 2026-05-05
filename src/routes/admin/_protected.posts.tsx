import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  listAdminPosts,
  listAdminFilterMeta,
  bulkAdminPosts,
  type AdminPost,
} from "@/server/admin-posts.functions";

const search = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  status: z.enum(["all", "publish", "draft", "scheduled", "private", "trash"]).optional().default("all"),
  type: z.enum(["all", "post", "page"]).optional().default("all"),
  categoryId: z.coerce.number().int().nullable().optional(),
  authorId: z.coerce.number().int().nullable().optional(),
  q: z.string().optional().default(""),
  sort: z.enum(["title", "status", "type", "author", "category", "modified_at", "published_at", "comment_count"]).optional().default("modified_at"),
  dir: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const Route = createFileRoute("/admin/_protected/posts")({
  validateSearch: (s) => search.parse(s),
  component: PostsListPage,
});

const PAGE_SIZE = 50;

const STATUS_BADGE: Record<string, string> = {
  publish: "bg-green-100 text-green-900",
  draft: "bg-neutral-100 text-neutral-700",
  future: "bg-blue-100 text-blue-900",
  scheduled: "bg-blue-100 text-blue-900",
  private: "bg-purple-100 text-purple-900",
  trash: "bg-red-100 text-red-900",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE[status] ?? "bg-neutral-100 text-neutral-700";
  const label = status === "future" ? "scheduled" : status;
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function PostsListPage() {
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/posts" });

  const [items, setItems] = useState<AdminPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [meta, setMeta] = useState<{ categories: Array<{ id: number; name: string }>; authors: Array<{ id: number; display_name: string }> } | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const refresh = useMemo(
    () => async () => {
      setLoading(true);
      try {
        const res = await listAdminPosts({
          data: {
            page: params.page,
            pageSize: PAGE_SIZE,
            status: params.status,
            type: params.type,
            categoryId: params.categoryId ?? null,
            authorId: params.authorId ?? null,
            q: params.q,
            sort: params.sort,
            dir: params.dir,
          },
        });
        setItems(res.items);
        setTotal(res.total);
        setSelected(new Set());
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load posts");
      } finally {
        setLoading(false);
      }
    },
    [params.page, params.status, params.type, params.categoryId, params.authorId, params.q, params.sort, params.dir],
  );

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { listAdminFilterMeta().then(setMeta).catch(() => {}); }, []);

  const setSearch = (patch: Partial<typeof params>) =>
    navigate({ search: (prev: any) => ({ ...prev, ...patch, page: patch.page ?? 1 }) });

  const toggle = (id: number) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const allChecked = items.length > 0 && items.every((i) => selected.has(i.id));
  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };

  const bulk = async (action: "publish" | "unpublish" | "trash" | "duplicate") => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    try {
      const res = await bulkAdminPosts({ data: { ids, action } });
      toast.success(`${action}: ${(res as any).updated ?? (res as any).duplicated ?? ids.length}`);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Bulk action failed");
    }
  };

  const sortBy = (col: typeof params.sort) => {
    const dir = params.sort === col && params.dir === "desc" ? "asc" : "desc";
    setSearch({ sort: col, dir });
  };

  const arrow = (col: string) => (params.sort !== col ? "" : params.dir === "desc" ? " ↓" : " ↑");

  return (
    <div className="min-h-full bg-[#F7F8FB] -m-6 p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Posts</h1>
        <Link
          to="/admin"
          search={{} as any}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New post
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-lg bg-white border p-3 flex flex-wrap items-center gap-2 mb-3">
        <input
          type="search"
          placeholder="Search posts…"
          defaultValue={params.q}
          onKeyDown={(e) => { if (e.key === "Enter") setSearch({ q: (e.target as HTMLInputElement).value }); }}
          className="border rounded px-3 py-1.5 text-sm flex-1 min-w-[200px]"
        />
        <select value={params.status} onChange={(e) => setSearch({ status: e.target.value as any })} className="border rounded px-2 py-1.5 text-sm">
          <option value="all">All statuses</option>
          <option value="publish">Publish</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="private">Private</option>
          <option value="trash">Trash</option>
        </select>
        <select value={params.type} onChange={(e) => setSearch({ type: e.target.value as any })} className="border rounded px-2 py-1.5 text-sm">
          <option value="all">All types</option>
          <option value="post">Post</option>
          <option value="page">Page</option>
        </select>
        <select
          value={params.categoryId ?? ""}
          onChange={(e) => setSearch({ categoryId: e.target.value ? Number(e.target.value) : null })}
          className="border rounded px-2 py-1.5 text-sm max-w-[180px]"
        >
          <option value="">All categories</option>
          {(meta?.categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={params.authorId ?? ""}
          onChange={(e) => setSearch({ authorId: e.target.value ? Number(e.target.value) : null })}
          className="border rounded px-2 py-1.5 text-sm max-w-[180px]"
        >
          <option value="">All authors</option>
          {(meta?.authors ?? []).map((a) => <option key={a.id} value={a.id}>{a.display_name}</option>)}
        </select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="rounded-lg bg-white border p-2 flex items-center gap-2 mb-3 text-sm">
          <span className="text-muted-foreground">{selected.size} selected</span>
          <button onClick={() => bulk("publish")} className="rounded border px-2 py-1 hover:bg-[#F2F4F9]">Publish</button>
          <button onClick={() => bulk("unpublish")} className="rounded border px-2 py-1 hover:bg-[#F2F4F9]">Unpublish</button>
          <button onClick={() => bulk("duplicate")} className="rounded border px-2 py-1 hover:bg-[#F2F4F9]">Duplicate</button>
          <button onClick={() => bulk("trash")} className="rounded border px-2 py-1 hover:bg-red-50 text-red-700">Trash</button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg bg-white border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-white">
            <tr className="text-left">
              <th className="px-3 py-3 w-8"><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
              <th className="px-3 py-3 cursor-pointer" onClick={() => sortBy("title")}>Title{arrow("title")}</th>
              <th className="px-3 py-3 cursor-pointer" onClick={() => sortBy("status")}>Status{arrow("status")}</th>
              <th className="px-3 py-3 cursor-pointer" onClick={() => sortBy("type")}>Type{arrow("type")}</th>
              <th className="px-3 py-3 cursor-pointer" onClick={() => sortBy("author")}>Author{arrow("author")}</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3 cursor-pointer" onClick={() => sortBy("modified_at")}>Modified{arrow("modified_at")}</th>
              <th className="px-3 py-3 w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No posts found.</td></tr>
            ) : items.map((p) => (
              <tr key={p.id} className="border-t hover:bg-[#F2F4F9]">
                <td className="px-3 py-3"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} /></td>
                <td className="px-3 py-3">
                  <div className="font-medium text-foreground">{p.title}</div>
                  <div className="text-xs text-muted-foreground">/{p.slug}</div>
                </td>
                <td className="px-3 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-3 py-3 text-muted-foreground">{p.type}</td>
                <td className="px-3 py-3">{p.author?.display_name ?? "—"}</td>
                <td className="px-3 py-3">{p.category?.name ?? "—"}</td>
                <td className="px-3 py-3 text-muted-foreground">{fmt(p.modified_at)}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Link to="/admin" className="hover:underline">Edit</Link>
                    <button onClick={() => bulkAdminPosts({ data: { ids: [p.id], action: "duplicate" } }).then(refresh)} className="hover:underline">Duplicate</button>
                    <button onClick={() => bulkAdminPosts({ data: { ids: [p.id], action: "trash" } }).then(refresh)} className="hover:underline text-red-700">Trash</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
        <div>{total.toLocaleString()} total · page {params.page} of {totalPages}</div>
        <div className="flex gap-2">
          <button
            disabled={params.page <= 1}
            onClick={() => setSearch({ page: params.page - 1 })}
            className="rounded border bg-white px-3 py-1.5 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            disabled={params.page >= totalPages}
            onClick={() => setSearch({ page: params.page + 1 })}
            className="rounded border bg-white px-3 py-1.5 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
