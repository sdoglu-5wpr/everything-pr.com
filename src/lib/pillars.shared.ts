// Shared pillar fetch logic — runs in browser (post-hydration nav) and on server.
import { resolvePostImageUrl, rewriteLegacyUrl } from "@/lib/legacy-urls";

export type PillarFAQ = { q: string; a: string };

export type PillarRecord = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  byline: string | null;
  body_html: string;
  schema_jsonld: any | null;
  faq: PillarFAQ[];
  hero_image_url: string | null;
};

export type PillarArticleItem = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
  featured_image_url: string | null;
  author: { id: number; display_name: string; slug: string } | null;
  category: { name: string; slug: string } | null;
};

export type PillarPayload = {
  pillar: PillarRecord;
  total: number;
  page: number;
  pageSize: number;
  items: PillarArticleItem[];
};

function rowToItem(r: any): PillarArticleItem {
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

export async function fetchPillarViaRpc(
  client: any,
  slug: string,
  page = 1,
  pageSize = 12,
): Promise<PillarPayload | null> {
  const { data, error } = await client.rpc("get_pillar", {
    p_slug: slug,
    p_page: page,
    p_page_size: pageSize,
  });
  if (error) {
    console.error("get_pillar failed:", error);
    return null;
  }
  if (!data || !data.pillar) return null;
  const p = data.pillar;
  return {
    pillar: {
      id: p.id,
      slug: p.slug,
      title: p.title,
      subtitle: p.subtitle ?? null,
      byline: p.byline ?? null,
      body_html: p.body_html ?? "",
      schema_jsonld: p.schema_jsonld ?? null,
      faq: Array.isArray(p.faq) ? p.faq : [],
      hero_image_url: rewriteLegacyUrl(p.hero_image_url ?? "") || null,
    },
    total: Number(data.total ?? 0),
    page: Number(data.page ?? 1),
    pageSize: Number(data.page_size ?? pageSize),
    items: ((data.items ?? []) as any[]).map(rowToItem),
  };
}
