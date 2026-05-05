import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  listAdminPosts,
  listAdminFilterMeta,
  bulkAdminPosts,
  type AdminPost,
} from "@/serverFns/admin-posts.functions";

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

export const Route = createFileRoute("/admin/_protected/posts/")({
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

function TypeChip({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
      {type}
    </span>
  );
}

function relTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

function PostsListPage() {
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/posts" });

  const [items, setItems] = useState<AdminPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [meta, setMeta] = useState<{ categories: Array<{ id: number; name: string }>; authors: Array<{ id: number; display_name: string }> } | null>(null);
  const [searchInput, setSearchInput] = useState(params.q);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [pageInput, setPageInput] = useState(String(params.page));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => { setSearchInput(params.q); }, [params.q]);
  useEffect(() => { setPageInput(String(params.page)); }, [params.page]);

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

  // Debounced search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchInput === params.q) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch({ q: searchInput }), 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
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

  const rowAction = async (id: number, action: "duplicate" | "trash") => {
    try {
      await bulkAdminPosts({ data: { ids: [id], action } });
      toast.success(action === "trash" ? "Moved to trash" : "Duplicated");
      setOpenMenu(null);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    }
  };

  const sortBy = (col: typeof params.sort) => {
    const dir = params.sort === col && params.dir === "desc" ? "asc" : "desc";
    setSearch({ sort: col, dir });
  };

  const arrow = (col: string) => (params.sort !== col ? "" : params.dir === "desc" ? " ↓" : " ↑");

  const hasFilters =
    params.status !== "all" || params.type !== "all" || params.categoryId != null ||
    params.authorId != null || (params.q ?? "").length > 0;

  const clearFilters = () =>
    navigate({ search: { page: 1, status: "all", type: "all", q: "", sort: "modified_at", dir: "desc" } as any });

  return (
    <div className="min-h-full bg-admin-surface -m-6 p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Posts</h1>
        <Link
          to="/admin/posts/new"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New post
        </Link>
      </div>

      {/* Filters */}
      <div className="sticky top-0 z-10 rounded-lg bg-white border p-3 flex flex-wrap items-center gap-2 mb-3">
        <input
          type="search"
          placeholder="Search posts…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
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
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-muted-foreground hover:underline">
            Clear filters
          </button>
        )}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="rounded-lg bg-white border p-2 flex items-center gap-2 mb-3 text-sm">
          <span className="text-muted-foreground">{selected.size} selected</span>
          <button onClick={() => bulk("publish")} className="rounded border px-2 py-1 hover:bg-admin-hover">Publish</button>
          <button onClick={() => bulk("unpublish")} className="rounded border px-2 py-1 hover:bg-admin-hover">Unpublish</button>
          <button onClick={() => bulk("duplicate")} className="rounded border px-2 py-1 hover:bg-admin-hover">Duplicate</button>
          <button onClick={() => bulk("trash")} className="rounded border px-2 py-1 hover:bg-red-50 text-red-700">Trash</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-muted-foreground hover:underline">Cancel</button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg bg-white border overflow-visible">
        <table className="w-full text-sm">
          <thead className="border-b border-[#E5E7EB] bg-white">
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-3 w-8"><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
              <th className="px-3 py-3 w-14"></th>
              <th className="px-3 py-3 cursor-pointer select-none" onClick={() => sortBy("title")}>Title{arrow("title")}</th>
              <th className="px-3 py-3 cursor-pointer select-none" onClick={() => sortBy("status")}>Status{arrow("status")}</th>
              <th className="px-3 py-3 cursor-pointer select-none" onClick={() => sortBy("type")}>Type{arrow("type")}</th>
              <th className="px-3 py-3 cursor-pointer select-none" onClick={() => sortBy("author")}>Author{arrow("author")}</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3 cursor-pointer select-none" onClick={() => sortBy("modified_at")}>Modified{arrow("modified_at")}</th>
              <th className="px-3 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center">
                <div className="text-muted-foreground mb-2">No posts match your filters.</div>
                {hasFilters && (
                  <button onClick={clearFilters} className="text-sm text-primary hover:underline">Clear filters</button>
                )}
              </td></tr>
            ) : items.map((p) => (
              <tr key={p.id} className="border-t border-[#E5E7EB] hover:bg-admin-hover">
                <td className="px-3 py-3"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} /></td>
                <td className="px-3 py-3">
                  {p.thumbnail_url ? (
                    <img src={p.thumbnail_url} alt="" className="h-12 w-12 rounded-md object-cover" loading="lazy" />
                  ) : (
                    <div className="h-12 w-12 rounded-md bg-neutral-100" />
                  )}
                </td>
                <td className="px-3 py-3">
                  <Link to="/admin/posts/$id" params={{ id: String(p.id) }} className="font-medium text-foreground hover:underline">{p.title}</Link>
                  <div className="text-xs text-muted-foreground truncate max-w-md">/{p.slug}</div>
                </td>
                <td className="px-3 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-3 py-3"><TypeChip type={p.type} /></td>
                <td className="px-3 py-3 text-foreground">{p.author?.display_name ?? "—"}</td>
                <td className="px-3 py-3">{p.category ? (
                  <span className="inline-flex items-center rounded bg-neutral-100 px-2 py-0.5 text-xs">{p.category.name}</span>
                ) : "—"}</td>
                <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{relTime(p.modified_at)}</td>
                <td className="px-3 py-3 relative">
                  <button
                    onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}
                    className="rounded px-1.5 py-1 hover:bg-neutral-100 text-muted-foreground"
                    aria-label="Actions"
                  >
                    ⋯
                  </button>
                  {openMenu === p.id && (
                    <div className="absolute right-3 top-10 z-20 w-40 rounded-md border bg-white shadow-lg text-sm">
                      <Link to="/admin/posts/$id" params={{ id: String(p.id) }} className="block px-3 py-2 hover:bg-admin-hover" onClick={() => setOpenMenu(null)}>Edit</Link>
                      <button onClick={() => rowAction(p.id, "duplicate")} className="block w-full text-left px-3 py-2 hover:bg-admin-hover">Duplicate</button>
                      <a href={`/${p.slug}/`} target="_blank" rel="noopener noreferrer" className="block px-3 py-2 hover:bg-admin-hover" onClick={() => setOpenMenu(null)}>View on site</a>
                      <button onClick={() => rowAction(p.id, "trash")} className="block w-full text-left px-3 py-2 hover:bg-red-50 text-red-700">Trash</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
        <div>{total.toLocaleString()} total · page {params.page} of {totalPages.toLocaleString()}</div>
        <div className="flex items-center gap-2">
          <button
            disabled={params.page <= 1}
            onClick={() => setSearch({ page: params.page - 1 })}
            className="rounded border bg-white px-3 py-1.5 disabled:opacity-50"
          >
            Previous
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const n = Math.max(1, Math.min(totalPages, Number(pageInput) || 1));
              setSearch({ page: n });
            }}
            className="flex items-center gap-1"
          >
            <span>Go to</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              className="w-16 rounded border bg-white px-2 py-1.5 text-center"
            />
          </form>
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
