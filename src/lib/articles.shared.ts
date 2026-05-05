// Shared article-fetch logic that runs in both the browser (after click-nav
// on Netlify static hosting) and on the server (SSR / prerender). Takes a
// Supabase client so callers can pass either the browser client or the
// server anon client.
import {
  pickFirstImageSrc,
  resolvePostImageUrl,
  rewriteLegacyHtml,
  rewriteLegacyUrl,
  stripFirstImage,
} from "@/lib/legacy-urls";
import type {
  ArticlePayload,
  ArticleRecord,
  ArticleCategory,
  RelatedPost,
} from "@/serverFns/articles.functions";

function relatedFromRow(r: any): RelatedPost {
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
    author_name: r.author?.display_name ?? null,
    category_name: r.category?.name ?? null,
  };
}

export async function fetchArticleViaRpc(
  client: any,
  slug: string,
): Promise<ArticlePayload | null> {
  const cleanSlug = slug.replace(/^\/|\/$/g, "");
  const { data: rpc, error } = await client.rpc("get_article_full", {
    slug_param: cleanSlug,
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

  return {
    article,
    topStories: topStoriesRaw.map(relatedFromRow),
    otherNews: otherNewsRaw.map(relatedFromRow),
  };
}
