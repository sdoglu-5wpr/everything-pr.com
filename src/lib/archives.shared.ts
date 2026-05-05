// Shared archive-fetch logic that runs in both browser (Netlify static
// post-hydration nav) and on the server.
import { resolvePostImageUrl, rewriteLegacyUrl } from "@/lib/legacy-urls";
import type { ArchivePayload, ArchiveItem, ArchiveHeader } from "@/serverFns/archives.functions";

export const PAGE_SIZE = 10;

type ArchiveInput =
  | { kind: "category"; slug: string; page?: number }
  | { kind: "tag"; slug: string; page?: number }
  | { kind: "author"; slug: string; page?: number }
  | { kind: "date"; year: number; month?: number; day?: number; page?: number }
  | { kind: "search"; q: string; page?: number };

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

export async function fetchArchiveViaRpc(client: any, input: ArchiveInput): Promise<ArchivePayload | null> {
  const page = Math.max(1, Math.floor(Number(input.page ?? 1)) || 1);

  if (input.kind === "search" && !(input.q ?? "").trim()) {
    return {
      header: { kind: "search", title: "Search", subtitle: "Enter a query above." },
      items: [],
      page: 1,
      totalItems: 0,
      totalPages: 1,
    };
  }

  const params: Record<string, any> = {
    p_kind: input.kind,
    p_page: page,
    p_page_size: PAGE_SIZE,
  };
  if (input.kind === "category" || input.kind === "tag" || input.kind === "author") {
    params.p_slug = input.slug;
  }
  if (input.kind === "date") {
    params.p_year = input.year;
    params.p_month = input.month ?? null;
    params.p_day = input.day ?? null;
  }
  if (input.kind === "search") {
    params.p_q = input.q;
  }

  const { data: rpc, error } = await client.rpc("get_archive_list", params);
  if (error) {
    console.error("get_archive_list failed:", error);
    return null;
  }
  if (!rpc) return null;

  const items = ((rpc.items ?? []) as any[]).map(rowToItem);
  const total = Number(rpc.total ?? 0);

  return {
    header: buildHeader(input, rpc.term, total),
    items,
    page,
    totalItems: total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
