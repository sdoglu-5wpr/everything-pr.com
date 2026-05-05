import { createServerFn } from "@tanstack/react-start";
import { supabaseAnon } from "@/integrations/supabase/client.anon.server";
import { rewriteLegacyUrl } from "@/lib/legacy-urls";

export const PAGE_SIZE = 10;

export type ArchiveItem = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
  featured_image_url: string | null;
  author: { id: number; display_name: string; slug: string } | null;
  category: { name: string; slug: string } | null;
};

export type ArchiveHeader = {
  kind: "category" | "tag" | "author" | "date" | "search";
  title: string;
  subtitle: string | null;
  // For author kind
  author?: {
    display_name: string;
    slug: string;
    avatar_url: string | null;
    bio: string | null;
  };
};

export type ArchivePayload = {
  header: ArchiveHeader;
  items: ArchiveItem[];
  page: number;
  totalPages: number;
  totalItems: number;
};

type ArchiveInput =
  | { kind: "category"; slug: string; page?: number }
  | { kind: "tag"; slug: string; page?: number }
  | { kind: "author"; slug: string; page?: number }
  | { kind: "date"; year: number; month?: number; day?: number; page?: number }
  | { kind: "search"; q: string; page?: number };

function pickFirstImage(html: string | null | undefined): string | null {
  if (!html) return null;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1] ?? null;
}

async function enrich(rows: any[]): Promise<ArchiveItem[]> {
  if (!rows.length) return [];
  const mediaIds = rows.map((r) => r.featured_media_id).filter(Boolean);
  const authorIds = rows.map((r) => r.author_id).filter(Boolean);
  const postIds = rows.map((r) => r.id);

  const [mediaRes, authorRes, pcRes] = await Promise.all([
    mediaIds.length
      ? supabaseAnon.from("media").select("id, url").in("id", mediaIds)
      : Promise.resolve({ data: [] as any[] }),
    authorIds.length
      ? supabaseAnon
          .from("authors")
          .select("id, display_name, slug")
          .in("id", authorIds)
      : Promise.resolve({ data: [] as any[] }),
    supabaseAnon
      .from("post_categories")
      .select("post_id, category_id")
      .in("post_id", postIds),
  ]);

  const catIds = (pcRes.data ?? []).map((r: any) => r.category_id);
  const { data: cats } = catIds.length
    ? await supabaseAnon.from("categories").select("id, name, slug").in("id", catIds)
    : { data: [] as any[] };

  const mediaMap = new Map((mediaRes.data ?? []).map((m: any) => [m.id, m.url as string]));
  const authorMap = new Map((authorRes.data ?? []).map((a: any) => [a.id, a]));
  const catMap = new Map(
    (cats ?? []).map((c: any) => [c.id, { name: c.name as string, slug: c.slug as string }])
  );
  const postCat = new Map<number, { name: string; slug: string }>();
  for (const pc of pcRes.data ?? []) {
    if (!postCat.has(pc.post_id)) {
      const c = catMap.get(pc.category_id);
      if (c) postCat.set(pc.post_id, c);
    }
  }

  return rows.map((r) => {
    const a = r.author_id ? authorMap.get(r.author_id) : null;
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      published_at: r.published_at,
      featured_image_url:
        rewriteLegacyUrl(
          (r.featured_media_id && mediaMap.get(r.featured_media_id)) ||
            pickFirstImage(r.content_html) ||
            ""
        ) || null,
      author: a
        ? { id: a.id, display_name: a.display_name, slug: a.slug }
        : null,
      category: postCat.get(r.id) ?? null,
    };
  });
}

function clampPage(p: number | undefined): number {
  const n = Math.max(1, Math.floor(Number(p ?? 1)));
  return Number.isFinite(n) ? n : 1;
}

async function fetchByPostIds(
  postIds: number[],
  page: number,
  count: number | null
): Promise<{ items: ArchiveItem[]; total: number }> {
  if (!postIds.length) return { items: [], total: 0 };
  const total = count ?? postIds.length;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: rows } = await supabaseAnon
    .from("posts")
    .select(
      "id, slug, title, excerpt, content_html, published_at, featured_media_id, author_id"
    )
    .eq("status", "publish")
    .eq("type", "post")
    .in("id", postIds)
    .order("published_at", { ascending: false, nullsFirst: false })
    .range(from, to);
  const items = await enrich((rows ?? []) as any[]);
  return { items, total };
}

export const getArchive = createServerFn({ method: "GET" })
  .inputValidator((input: ArchiveInput) => input)
  .handler(async ({ data }): Promise<ArchivePayload | null> => {
    const page = clampPage((data as any).page);

    if (data.kind === "category" || data.kind === "tag") {
      const table = data.kind === "category" ? "categories" : "tags";
      const linkTable = data.kind === "category" ? "post_categories" : "post_tags";
      const linkCol = data.kind === "category" ? "category_id" : "tag_id";

      const { data: term } = await supabaseAnon
        .from(table)
        .select("id, name, slug, description, post_count")
        .eq("slug", data.slug)
        .maybeSingle();
      if (!term) return null;

      const { data: links, count } = await (supabaseAnon as any)
        .from(linkTable)
        .select("post_id", { count: "exact" })
        .eq(linkCol, term.id);
      const ids = (links ?? []).map((r: any) => r.post_id as number);
      const { items, total } = await fetchByPostIds(ids, page, count ?? ids.length);

      return {
        header: {
          kind: data.kind,
          title: term.name,
          subtitle: term.description ?? null,
        },
        items,
        page,
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      };
    }

    if (data.kind === "author") {
      const { data: author } = await supabaseAnon
        .from("authors")
        .select("id, display_name, slug, avatar_url, bio")
        .eq("slug", data.slug)
        .maybeSingle();
      if (!author) return null;

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data: rows, count } = await supabaseAnon
        .from("posts")
        .select(
          "id, slug, title, excerpt, content_html, published_at, featured_media_id, author_id",
          { count: "exact" }
        )
        .eq("status", "publish")
        .eq("type", "post")
        .eq("author_id", author.id)
        .order("published_at", { ascending: false, nullsFirst: false })
        .range(from, to);
      const items = await enrich((rows ?? []) as any[]);
      const total = count ?? items.length;

      return {
        header: {
          kind: "author",
          title: author.display_name,
          subtitle: author.bio ?? null,
          author: {
            display_name: author.display_name,
            slug: author.slug,
            avatar_url: rewriteLegacyUrl(author.avatar_url ?? "") || null,
            bio: author.bio ?? null,
          },
        },
        items,
        page,
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      };
    }

    if (data.kind === "date") {
      const { year, month, day } = data;
      const start = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
      const end = new Date(start);
      if (day) end.setUTCDate(end.getUTCDate() + 1);
      else if (month) end.setUTCMonth(end.getUTCMonth() + 1);
      else end.setUTCFullYear(end.getUTCFullYear() + 1);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data: rows, count } = await supabaseAnon
        .from("posts")
        .select(
          "id, slug, title, excerpt, content_html, published_at, featured_media_id, author_id",
          { count: "exact" }
        )
        .eq("status", "publish")
        .eq("type", "post")
        .gte("published_at", start.toISOString())
        .lt("published_at", end.toISOString())
        .order("published_at", { ascending: false, nullsFirst: false })
        .range(from, to);
      const items = await enrich((rows ?? []) as any[]);
      const total = count ?? items.length;

      const fmt = day
        ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        : month
          ? `${year}-${String(month).padStart(2, "0")}`
          : `${year}`;
      return {
        header: {
          kind: "date",
          title: `Archives: ${fmt}`,
          subtitle: total ? `${total} article${total === 1 ? "" : "s"}` : null,
        },
        items,
        page,
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      };
    }

    if (data.kind === "search") {
      const q = (data.q ?? "").trim();
      if (!q) {
        return {
          header: { kind: "search", title: "Search", subtitle: "Enter a query above." },
          items: [],
          page: 1,
          totalItems: 0,
          totalPages: 1,
        };
      }
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const tsQuery = q
        .replace(/['\\:&|!()<>]/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .map((t) => `${t}:*`)
        .join(" & ");

      let rowsRes: any;
      if (tsQuery) {
        rowsRes = await supabaseAnon
          .from("posts")
          .select(
            "id, slug, title, excerpt, content_html, published_at, featured_media_id, author_id",
            { count: "exact" }
          )
          .eq("status", "publish")
          .eq("type", "post")
          .textSearch("search_vector", tsQuery, { config: "english" })
          .order("published_at", { ascending: false, nullsFirst: false })
          .range(from, to);
      }

      // Fallback to ILIKE on title if tsvector returns nothing
      if (!rowsRes || !rowsRes.data || rowsRes.data.length === 0) {
        rowsRes = await supabaseAnon
          .from("posts")
          .select(
            "id, slug, title, excerpt, content_html, published_at, featured_media_id, author_id",
            { count: "exact" }
          )
          .eq("status", "publish")
          .eq("type", "post")
          .ilike("title", `%${q}%`)
          .order("published_at", { ascending: false, nullsFirst: false })
          .range(from, to);
      }

      const items = await enrich((rowsRes.data ?? []) as any[]);
      const total = rowsRes.count ?? items.length;
      return {
        header: {
          kind: "search",
          title: `Search: "${q}"`,
          subtitle: total ? `${total} result${total === 1 ? "" : "s"}` : "No results",
        },
        items,
        page,
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      };
    }

    return null;
  });
