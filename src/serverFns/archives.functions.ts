import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { supabaseAnon } from "@/integrations/supabase/client.anon.server";
import { cached } from "@/serverFns/loader-cache.server";
import { pickFirstImageSrc, resolvePostImageUrl, rewriteLegacyUrl } from "@/lib/legacy-urls";
import { htmlToPlainText } from "@/lib/text";

function setArchiveCache() {
  try {
    setResponseHeader(
      "Cache-Control",
      process.env.INDEXING_ENABLED === "true"
        ? "public, max-age=60, s-maxage=120, stale-while-revalidate=300"
        : "private, max-age=0, must-revalidate",
    );
  } catch {}
}

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
  seo?: {
    title: string | null;
    description: string | null;
    canonical_url: string | null;
    robots: string | null;
    og_image: string | null;
  };
  author?: {
    display_name: string;
    slug: string;
    avatar_url: string | null;
    bio: string | null;
    website: string | null;
    email: string | null;
    social: { twitter?: string | null; linkedin?: string | null; facebook?: string | null; instagram?: string | null } | null;
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

function clampPage(p: number | undefined): number {
  const n = Math.max(1, Math.floor(Number(p ?? 1)));
  return Number.isFinite(n) ? n : 1;
}

function rowToItem(r: any): ArchiveItem {
  const a = r.author ?? null;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    published_at: r.published_at,
    featured_image_url: resolvePostImageUrl(
      r.media_url,
      r.content_html ? rewriteLegacyUrl(r.content_html) : null,
      r.og_image,
    ),
    author: a ? { id: a.id, display_name: a.display_name, slug: a.slug } : null,
    category: r.category ?? null,
  };
}

function buildHeader(input: ArchiveInput, term: any, total: number): ArchiveHeader {
  if (input.kind === "category" || input.kind === "tag") {
    return {
      kind: input.kind,
      title: term?.name ?? input.slug,
      subtitle: term?.description ?? null,
    };
  }
  if (input.kind === "author") {
    return {
      kind: "author",
      title: term?.display_name ?? input.slug,
      subtitle: term?.bio ?? null,
      author: {
        display_name: term?.display_name ?? input.slug,
        slug: term?.slug ?? input.slug,
        avatar_url: rewriteLegacyUrl(term?.avatar_url ?? "") || null,
        bio: term?.bio ?? null,
        website: term?.website ?? null,
        email: term?.email ?? null,
        social: term?.social ?? null,
      },
    };
  }
  if (input.kind === "date") {
    const { year, month, day } = input;
    const fmt = day
      ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      : month
        ? `${year}-${String(month).padStart(2, "0")}`
        : `${year}`;
    return {
      kind: "date",
      title: `Archives: ${fmt}`,
      subtitle: total ? `${total} article${total === 1 ? "" : "s"}` : null,
    };
  }
  return {
    kind: "search",
    title: `Search: "${input.q}"`,
    subtitle: total ? `${total} result${total === 1 ? "" : "s"}` : "No results",
  };
}

export const getArchive = createServerFn({ method: "GET" })
  .inputValidator((input: ArchiveInput) => input)
  .handler(async ({ data }): Promise<ArchivePayload | null> => {
    setArchiveCache();
    const page = clampPage((data as any).page);

    if (data.kind === "search" && !(data.q ?? "").trim()) {
      return {
        header: { kind: "search", title: "Search", subtitle: "Enter a query above." },
        items: [],
        page: 1,
        totalItems: 0,
        totalPages: 1,
      };
    }

    const cacheKey = `archive:${data.kind}:${(data as any).slug ?? ""}:${(data as any).year ?? ""}-${(data as any).month ?? ""}-${(data as any).day ?? ""}:q=${(data as any).q ?? ""}:p=${page}`;

    return cached(cacheKey, 60_000, async () => {
      const params: Record<string, any> = {
        p_kind: data.kind,
        p_page: page,
        p_page_size: PAGE_SIZE,
      };
      if (data.kind === "category" || data.kind === "tag" || data.kind === "author") {
        params.p_slug = data.slug;
      }
      if (data.kind === "date") {
        params.p_year = data.year;
        params.p_month = data.month ?? null;
        params.p_day = data.day ?? null;
      }
      if (data.kind === "search") {
        params.p_q = data.q;
      }

      const t0 = Date.now();
      const { data: rpc, error } = await (supabaseAnon as any).rpc("get_archive_list", params);
      console.log(`[archive] kind=${data.kind} page=${page} rpc=${Date.now() - t0}ms`);
      if (error) {
        console.error("get_archive_list failed:", error);
        return null;
      }
      if (!rpc) return null;

      const items = ((rpc.items ?? []) as any[]).map(rowToItem);
      const total = Number(rpc.total ?? 0);

      return {
        header: buildHeader(data, rpc.term, total),
        items,
        page,
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      };
    });
  });

