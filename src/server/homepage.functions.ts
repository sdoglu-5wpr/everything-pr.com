import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { supabaseAnon } from "@/integrations/supabase/client.anon.server";
import { cached } from "@/server/loader-cache.server";
import { pickFirstImageSrc, resolvePostImageUrl, rewriteLegacyUrl } from "@/lib/legacy-urls";

export type HomePost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
  featured_image_url: string | null;
  author: { id: number; display_name: string; slug: string; avatar_url: string | null } | null;
  category: { name: string; slug: string } | null;
};

export type HomeAuthor = {
  id: number;
  display_name: string;
  slug: string;
  avatar_url: string | null;
  bio: string | null;
  post_count: number;
};

export type HomeMenuItem = { label: string; href: string };

export type HomePayload = {
  ticker: { slug: string; title: string }[];
  hero: HomePost | null;
  topStories: HomePost[];
  sections: { key: string; title: string; slug: string; posts: HomePost[] }[];
  crisis: { title: string; slug: string; posts: HomePost[] };
  topAuthors: HomeAuthor[];
  economy: HomePost | null;
  otherNews: HomePost[];
  footerMenu: HomeMenuItem[];
};

const SECTION_DEFS: { key: string; title: string; slug: string }[] = [
  { key: "pr-news", title: "PR News", slug: "pr-news" },
  { key: "pr-insights", title: "Insights", slug: "pr-insights" },
  { key: "marketing", title: "Marketing", slug: "marketing" },
  { key: "social-media", title: "Social Media", slug: "social-media" },
];

function normalizeFooterUrl(url: string): string {
  if (!url) return "/";
  if (url === "#") return "/";
  const m = url.match(/^https?:\/\/(?:www\.)?everything-pr\.com(\/.*)?$/i);
  if (m) return m[1] || "/";
  return url;
}

function toPost(r: any, fallbackCategory?: { name: string; slug: string }): HomePost {
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
    author: a
      ? {
          id: a.id,
          display_name: a.display_name,
          slug: a.slug,
          avatar_url: rewriteLegacyUrl(a.avatar_url ?? "") || null,
        }
      : null,
    category: r.category ?? fallbackCategory ?? null,
  };
}

export const getHomepage = createServerFn({ method: "GET" }).handler(async (): Promise<HomePayload> => {
  try {
    setResponseHeader(
      "Cache-Control",
      process.env.INDEXING_ENABLED === "true"
        ? "public, max-age=30, s-maxage=60, stale-while-revalidate=300"
        : "private, max-age=0, must-revalidate",
    );
  } catch {}

  return cached("homepage:v1", 60_000, async () => {
    const sectionSlugs = SECTION_DEFS.map((s) => s.slug);
    const t0 = Date.now();
    const { data: rpc, error } = await (supabaseAnon as any).rpc("get_homepage_data", {
      p_section_slugs: sectionSlugs,
      p_crisis_slug: "crisis-pr",
      p_economy_slug: "corporate-pr",
    });
    console.log(`[homepage] rpc=${Date.now() - t0}ms`);

    if (error) {
      console.error("get_homepage_data failed:", error);
      return {
        ticker: [],
        hero: null,
        topStories: [],
        sections: SECTION_DEFS.map((s) => ({ ...s, posts: [] })),
        crisis: { title: "Crisis", slug: "crisis-pr", posts: [] },
        topAuthors: [],
        economy: null,
        otherNews: [],
        footerMenu: [],
      };
    }

    const latest = ((rpc?.latest ?? []) as any[]).map((r) => toPost(r));
    const ticker = latest.slice(0, 15).map((p) => ({ slug: p.slug, title: p.title }));
    const hero = latest[0] ?? null;
    const topStories = latest.slice(1, 5);
    const usedIds = new Set<number>(latest.slice(0, 5).map((p) => p.id));

    const sectionsObj = (rpc?.sections ?? {}) as Record<string, any[]>;
    const sections = SECTION_DEFS.map((s) => {
      const posts = (sectionsObj[s.slug] ?? [])
        .map((r) => toPost(r, { name: s.title, slug: s.slug }))
        .filter((p) => !usedIds.has(p.id))
        .slice(0, 3);
      for (const p of posts) usedIds.add(p.id);
      return { ...s, posts };
    });

    const crisisPosts = ((rpc?.crisis ?? []) as any[])
      .map((r) => toPost(r, { name: "Crisis", slug: "crisis-pr" }))
      .filter((p) => !usedIds.has(p.id))
      .slice(0, 3);
    for (const p of crisisPosts) usedIds.add(p.id);

    const economyRow = rpc?.economy ?? null;
    let economy: HomePost | null = economyRow
      ? toPost(economyRow, { name: "Economy", slug: "corporate-pr" })
      : null;
    if (economy && usedIds.has(economy.id)) economy = null;
    if (economy) usedIds.add(economy.id);

    const otherNews = latest.filter((p) => !usedIds.has(p.id)).slice(0, 3);

    const topAuthors: HomeAuthor[] = ((rpc?.top_authors ?? []) as any[]).map((a) => ({
      id: a.id,
      display_name: a.display_name,
      slug: a.slug,
      avatar_url: rewriteLegacyUrl(a.avatar_url ?? "") || null,
      bio: a.bio,
      post_count: a.post_count ?? 0,
    }));

    const footerMenu: HomeMenuItem[] = ((rpc?.footer_menu ?? []) as any[]).map((i) => ({
      label: String(i.label).replace(/&amp;/g, "&").replace(/&#0?38;/g, "&"),
      href: normalizeFooterUrl(i.url ?? "/"),
    }));

    return {
      ticker,
      hero,
      topStories,
      sections,
      crisis: { title: "Crisis", slug: "crisis-pr", posts: crisisPosts },
      topAuthors,
      economy,
      otherNews,
      footerMenu,
    };
  });
});

