import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STAFF_ROLES = ["admin", "editor", "author"] as const;

async function ensureStaff(supabase: any, userId: string) {
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (!roles?.some((r: any) => (STAFF_ROLES as readonly string[]).includes(r.role))) {
    throw new Error("forbidden");
  }
}

const SortField = z.enum([
  "title",
  "status",
  "type",
  "author",
  "category",
  "modified_at",
  "published_at",
  "comment_count",
]);

const ListInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(50),
  status: z.enum(["all", "publish", "draft", "scheduled", "private", "trash"]).default("all"),
  type: z.enum(["all", "post", "page"]).default("all"),
  categoryId: z.number().int().nullable().optional(),
  authorId: z.number().int().nullable().optional(),
  q: z.string().default(""),
  sort: SortField.default("modified_at"),
  dir: z.enum(["asc", "desc"]).default("desc"),
});

export type AdminPost = {
  id: number;
  slug: string;
  title: string;
  status: string;
  type: string;
  published_at: string | null;
  modified_at: string | null;
  author: { id: number; display_name: string; slug?: string } | null;
  category: { id: number; name: string; slug: string } | null;
  thumbnail_url: string | null;
  comment_count: number;
};

export const listAdminPosts = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => ListInput.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);

    let q = supabase
      .from("posts")
      .select(
        "id, slug, title, status, type, published_at, modified_at, author_id, featured_media_id",
        { count: "exact" },
      );

    if (data.status !== "all") {
      const s = data.status === "scheduled" ? "future" : data.status;
      q = q.eq("status", s);
    }
    if (data.type !== "all") q = q.eq("type", data.type);
    if (data.authorId != null) q = q.eq("author_id", data.authorId);
    if (data.q.trim()) {
      const term = data.q.trim();
      const tsQuery = term
        .replace(/['\\:&|!()<>]/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .map((t) => `${t}:*`)
        .join(" & ");
      if (tsQuery) {
        q = q.textSearch("search_vector", tsQuery, { config: "english" });
      } else {
        q = q.ilike("title", `%${term}%`);
      }
    }

    if (data.categoryId != null) {
      const { data: links } = await supabase
        .from("post_categories")
        .select("post_id")
        .eq("category_id", data.categoryId);
      const ids = (links ?? []).map((r: any) => r.post_id);
      if (ids.length === 0) {
        return { items: [], page: data.page, pageSize: data.pageSize, total: 0 };
      }
      q = q.in("id", ids);
    }

    const sortable: Record<string, string> = {
      title: "title",
      status: "status",
      type: "type",
      modified_at: "modified_at",
      published_at: "published_at",
      author: "author_id",
      category: "modified_at",
      comment_count: "modified_at",
    };
    const orderCol = sortable[data.sort] ?? "modified_at";
    q = q.order(orderCol, { ascending: data.dir === "asc", nullsFirst: false });

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    q = q.range(from, to);

    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);

    const postIds = (rows ?? []).map((r: any) => r.id);
    const authorIds = Array.from(new Set((rows ?? []).map((r: any) => r.author_id).filter(Boolean)));
    const mediaIds = Array.from(new Set((rows ?? []).map((r: any) => r.featured_media_id).filter(Boolean)));

    const [authorRes, pcRes, mediaRes] = await Promise.all([
      authorIds.length
        ? supabase.from("authors").select("id, display_name, slug").in("id", authorIds)
        : Promise.resolve({ data: [] as any[] }),
      postIds.length
        ? supabase.from("post_categories").select("post_id, category_id").in("post_id", postIds)
        : Promise.resolve({ data: [] as any[] }),
      mediaIds.length
        ? supabase.from("media").select("id, url").in("id", mediaIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const catIds = Array.from(new Set((pcRes.data ?? []).map((r: any) => r.category_id)));
    const { data: cats } = catIds.length
      ? await supabase.from("categories").select("id, name, slug").in("id", catIds)
      : { data: [] as any[] };
    const catMap = new Map((cats ?? []).map((c: any) => [c.id, c]));
    const postCat = new Map<number, any>();
    for (const pc of pcRes.data ?? []) {
      if (!postCat.has(pc.post_id)) {
        const c = catMap.get(pc.category_id);
        if (c) postCat.set(pc.post_id, c);
      }
    }
    const authorMap = new Map((authorRes.data ?? []).map((a: any) => [a.id, a]));
    const mediaMap = new Map((mediaRes.data ?? []).map((m: any) => [m.id, m.url as string]));

    const { rewriteLegacyUrl } = await import("@/lib/legacy-urls");

    const items: AdminPost[] = (rows ?? []).map((r: any) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      status: r.status,
      type: r.type,
      published_at: r.published_at,
      modified_at: r.modified_at,
      author: r.author_id ? (authorMap.get(r.author_id) ?? null) : null,
      category: postCat.get(r.id) ?? null,
      thumbnail_url: r.featured_media_id
        ? (rewriteLegacyUrl(mediaMap.get(r.featured_media_id) ?? "") || null)
        : null,
      comment_count: 0,
    }));

    return { items, page: data.page, pageSize: data.pageSize, total: count ?? items.length };
  });

export const listAdminFilterMeta = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const [catsRes, authRes] = await Promise.all([
      supabase.from("categories").select("id, name, slug").order("name", { ascending: true }),
      supabase.from("authors").select("id, display_name").order("display_name", { ascending: true }),
    ]);
    return {
      categories: (catsRes.data ?? []) as Array<{ id: number; name: string; slug: string }>,
      authors: (authRes.data ?? []) as Array<{ id: number; display_name: string }>,
    };
  });

const BulkInput = z.object({
  ids: z.array(z.number().int()).min(1).max(500),
  action: z.enum(["publish", "unpublish", "trash", "duplicate"]),
});

export const bulkAdminPosts = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => BulkInput.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);

    if (data.action === "publish" || data.action === "unpublish" || data.action === "trash") {
      const status = data.action === "publish" ? "publish" : data.action === "unpublish" ? "draft" : "trash";
      const { error } = await supabase.from("posts").update({ status }).in("id", data.ids);
      if (error) throw new Error(error.message);
      return { ok: true, updated: data.ids.length };
    }

    // duplicate
    const { data: src, error: rErr } = await supabase
      .from("posts")
      .select("slug, title, type, content_html, content_text, excerpt, author_id, featured_media_id")
      .in("id", data.ids);
    if (rErr) throw new Error(rErr.message);
    const inserts = (src ?? []).map((r: any) => ({
      slug: `${r.slug}-copy-${Date.now()}`,
      title: `${r.title} (copy)`,
      type: r.type,
      status: "draft",
      content_html: r.content_html,
      content_text: r.content_text,
      excerpt: r.excerpt,
      author_id: r.author_id,
      featured_media_id: r.featured_media_id,
    }));
    if (inserts.length === 0) return { ok: true, duplicated: 0 };
    const { error: iErr } = await supabase.from("posts").insert(inserts as any);
    if (iErr) throw new Error(iErr.message);
    return { ok: true, duplicated: inserts.length };
  });
