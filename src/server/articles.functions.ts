import { createServerFn } from "@tanstack/react-start";
import { supabaseAnon } from "@/integrations/supabase/client.anon.server";
import { pickFirstImageSrc, resolvePostImageUrl, rewriteLegacyHtml, rewriteLegacyUrl } from "@/lib/legacy-urls";

export type ArticleAuthor = {
  id: number;
  display_name: string;
  slug: string;
  avatar_url: string | null;
  bio: string | null;
};

export type ArticleCategory = { id: number; name: string; slug: string };

export type ArticleRecord = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  content_html: string;
  published_at: string | null;
  modified_at: string | null;
  type: "post" | "page" | string;
  featured_image: { url: string; alt: string | null } | null;
  author: ArticleAuthor | null;
  categories: ArticleCategory[];
  seo: {
    title: string | null;
    description: string | null;
    canonical_url: string | null;
    og_title: string | null;
    og_description: string | null;
    og_image: string | null;
    robots: string | null;
  } | null;
};

export type RelatedPost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
  featured_image_url: string | null;
  author_name: string | null;
  category_name: string | null;
};

export type ArticlePayload = {
  article: ArticleRecord;
  topStories: RelatedPost[];
  otherNews: RelatedPost[];
};

/* ------------------------- helpers ------------------------- */

async function buildRelated(rows: any[]): Promise<RelatedPost[]> {
  if (!rows.length) return [];
  const mediaIds = rows.map(r => r.featured_media_id).filter(Boolean);
  const authorIds = rows.map(r => r.author_id).filter(Boolean);
  const postIds = rows.map(r => r.id);

  const [{ data: media }, { data: authors }, { data: pcRows }] = await Promise.all([
    mediaIds.length
      ? supabaseAnon.from("media").select("id, url").in("id", mediaIds)
      : Promise.resolve({ data: [] as any[] }),
    authorIds.length
      ? supabaseAnon.from("authors").select("id, display_name").in("id", authorIds)
      : Promise.resolve({ data: [] as any[] }),
    supabaseAnon.from("post_categories").select("post_id, category_id").in("post_id", postIds),
  ]);

  const catIds = (pcRows ?? []).map(r => r.category_id);
  const { data: cats } = catIds.length
    ? await supabaseAnon.from("categories").select("id, name").in("id", catIds)
    : { data: [] as any[] };

  const mediaMap = new Map((media ?? []).map(m => [m.id, m.url]));
  const authorMap = new Map((authors ?? []).map(a => [a.id, a.display_name]));
  const catMap = new Map((cats ?? []).map(c => [c.id, c.name]));
  const postCat = new Map<number, string>();
  for (const pc of pcRows ?? []) {
    if (!postCat.has(pc.post_id)) {
      const name = catMap.get(pc.category_id);
      if (name) postCat.set(pc.post_id, name);
    }
  }

  return rows.map(r => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    published_at: r.published_at,
    featured_image_url: resolvePostImageUrl(
      r.featured_media_id && mediaMap.get(r.featured_media_id),
      pickFirstImageSrc(r.content_html),
    ),
    author_name: r.author_id ? authorMap.get(r.author_id) ?? null : null,
    category_name: postCat.get(r.id) ?? null,
  }));
}

/* ------------------------- server function ------------------------- */

export const getArticleBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => {
    if (!input?.slug || typeof input.slug !== "string") throw new Error("invalid slug");
    return { slug: input.slug.replace(/^\/|\/$/g, "") };
  })
  .handler(async ({ data }): Promise<ArticlePayload | null> => {
    // 1. Post
    const { data: post } = await supabaseAnon
      .from("posts")
      .select(
        "id, slug, title, excerpt, content_html, published_at, modified_at, type, status, author_id, featured_media_id"
      )
      .eq("slug", data.slug)
      .in("type", ["post", "page"])
      .eq("status", "publish")
      .maybeSingle();

    if (!post) return null;

    // 2. Featured media + author + categories + seo (parallel)
    const [
      { data: media },
      { data: author },
      { data: catLinks },
      { data: seo },
    ] = await Promise.all([
      post.featured_media_id
        ? supabaseAnon.from("media").select("url, alt_text").eq("id", post.featured_media_id).maybeSingle()
        : Promise.resolve({ data: null as any }),
      post.author_id
        ? supabaseAnon
            .from("authors")
            .select("id, display_name, slug, avatar_url, bio")
            .eq("id", post.author_id)
            .maybeSingle()
        : Promise.resolve({ data: null as any }),
      supabaseAnon.from("post_categories").select("category_id").eq("post_id", post.id),
      supabaseAnon
        .from("seo_meta")
        .select("title, description, canonical_url, og_title, og_description, og_image, robots")
        .eq("object_type", "post")
        .eq("object_id", post.id)
        .maybeSingle(),
    ]);

    const categoryIds = (catLinks ?? []).map(c => c.category_id);
    const { data: categories } = categoryIds.length
      ? await supabaseAnon
          .from("categories")
          .select("id, name, slug")
          .in("id", categoryIds)
      : { data: [] as ArticleCategory[] };

    // 3. Related — top stories (latest 5 published, excluding current)
    //    and other news (3 newest, excluding current and top stories)
    const { data: latest } = await supabaseAnon
      .from("posts")
      .select("id, slug, title, excerpt, published_at, featured_media_id, author_id, content_html")
      .eq("type", "post")
      .eq("status", "publish")
      .neq("id", post.id)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(8);

    const all = (latest ?? []) as any[];
    const topStoriesRaw = all.slice(0, 5);
    const otherNewsRaw = all.slice(5, 8);

    const [topStories, otherNews] = await Promise.all([
      buildRelated(topStoriesRaw),
      buildRelated(otherNewsRaw),
    ]);

    const fallbackImage = pickFirstImageSrc(post.content_html);
    const featuredUrl = resolvePostImageUrl(media?.url, fallbackImage);

    const rewrittenSeo = seo
      ? { ...seo, og_image: rewriteLegacyUrl(seo.og_image) || null, canonical_url: seo.canonical_url }
      : null;

    const article: ArticleRecord = {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content_html: rewriteLegacyHtml(post.content_html),
      published_at: post.published_at,
      modified_at: post.modified_at,
      type: post.type,
      featured_image: featuredUrl
        ? { url: featuredUrl, alt: media?.alt_text ?? post.title }
        : null,
      author: author ?? null,
      categories: (categories ?? []) as ArticleCategory[],
      seo: rewrittenSeo,
    };

    return { article, topStories, otherNews };
  });
