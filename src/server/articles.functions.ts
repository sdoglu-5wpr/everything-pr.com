import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { supabaseAnon } from "@/integrations/supabase/client.anon.server";
import {
  pickFirstImageSrc,
  resolvePostImageUrl,
  rewriteLegacyHtml,
  rewriteLegacyUrl,
  stripFirstImage,
} from "@/lib/legacy-urls";

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

function relatedFromRow(r: any): RelatedPost {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    published_at: r.published_at,
    featured_image_url: resolvePostImageUrl(r.media_url, pickFirstImageSrc(r.content_html), r.og_image),
    author_name: r.author?.display_name ?? null,
    category_name: r.category?.name ?? null,
  };
}

export const getArticleBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => {
    if (!input?.slug || typeof input.slug !== "string") throw new Error("invalid slug");
    return { slug: input.slug.replace(/^\/|\/$/g, "") };
  })
  .handler(async ({ data }): Promise<ArticlePayload | null> => {
    const { data: rpc, error } = await (supabaseAnon as any).rpc("get_article_full", {
      slug_param: data.slug,
    });
    if (error) {
      console.error("get_article_full failed:", error);
      return null;
    }
    if (!rpc) return null;

    const post = rpc.post;
    const author = rpc.author ?? null;
    const media = rpc.featured_media ?? null;
    const seo = rpc.seo ?? null;
    const categories = (rpc.categories ?? []) as ArticleCategory[];
    const topStoriesRaw = (rpc.top_stories ?? []) as any[];
    const otherNewsRaw = (rpc.other_news ?? []) as any[];

    const inlineFallback = pickFirstImageSrc(post.content_html);
    const seoOg = rewriteLegacyUrl(seo?.og_image);
    const featuredUrl = resolvePostImageUrl(media?.url, seoOg, inlineFallback);
    const featuredFromInline =
      !media?.url && !seoOg && !!inlineFallback && featuredUrl === inlineFallback;

    const renderedHtml = rewriteLegacyHtml(
      featuredFromInline ? stripFirstImage(post.content_html) : post.content_html,
    );

    const rewrittenSeo = seo
      ? { ...seo, og_image: rewriteLegacyUrl(seo.og_image) || null }
      : null;

    const article: ArticleRecord = {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content_html: renderedHtml,
      published_at: post.published_at,
      modified_at: post.modified_at,
      type: post.type,
      featured_image: featuredUrl
        ? { url: featuredUrl, alt: media?.alt_text ?? post.title }
        : null,
      author,
      categories,
      seo: rewrittenSeo,
    };

    // Edge cache (only when indexing enabled / production)
    if (process.env.INDEXING_ENABLED === "true") {
      try {
        setResponseHeader(
          "Cache-Control",
          "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
        );
      } catch {}
    }

    return {
      article,
      topStories: topStoriesRaw.map(relatedFromRow),
      otherNews: otherNewsRaw.map(relatedFromRow),
    };
  });
