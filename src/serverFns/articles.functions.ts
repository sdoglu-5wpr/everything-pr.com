import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { supabaseAnon } from "@/integrations/supabase/client.anon.server";
import { cached } from "@/serverFns/loader-cache.server";
import { fetchArticleViaRpc } from "@/lib/articles.shared";

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

export const getArticleBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => {
    if (!input?.slug || typeof input.slug !== "string") throw new Error("invalid slug");
    return { slug: input.slug.replace(/^\/|\/$/g, "") };
  })
  .handler(async ({ data }): Promise<ArticlePayload | null> => {
    try {
      setResponseHeader(
        "Cache-Control",
        process.env.INDEXING_ENABLED === "true"
          ? "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
          : "private, max-age=0, must-revalidate",
      );
    } catch {}

    return cached(`article:${data.slug}`, 60_000, async () => {
      const t0 = Date.now();
      const result = await fetchArticleViaRpc(supabaseAnon, data.slug);
      console.log(`[article] ${data.slug} rpc=${Date.now() - t0}ms`);
      return result;
    });
  });

