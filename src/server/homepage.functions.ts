import { createServerFn } from "@tanstack/react-start";
import { supabaseAnon } from "@/integrations/supabase/client.anon.server";
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
  // Strip absolute legacy host
  const match = url.match(/^https?:\/\/(?:www\.)?everything-pr\.com(\/.*)?$/i);
  if (match) return match[1] || "/";
  return url;
}

async function fetchPostsByCategorySlug(
  catSlug: string,
  limit: number,
  excludeIds: Set<number>
): Promise<HomePost[]> {
  const { data: cat } = await supabaseAnon
    .from("categories")
    .select("id, name, slug")
    .eq("slug", catSlug)
    .maybeSingle();
  if (!cat) return [];

  const { data: pcRows } = await supabaseAnon
    .from("post_categories")
    .select("post_id")
    .eq("category_id", cat.id)
    .limit(limit + excludeIds.size + 30);

  const candidateIds = (pcRows ?? [])
    .map((r) => r.post_id as number)
    .filter((id) => !excludeIds.has(id));
  if (!candidateIds.length) return [];

  const { data: rows } = await supabaseAnon
    .from("posts")
    .select(
      "id, slug, title, excerpt, content_html, published_at, featured_media_id, author_id"
    )
    .eq("status", "publish")
    .eq("type", "post")
    .in("id", candidateIds)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  return enrichPosts((rows ?? []) as any[], { name: cat.name, slug: cat.slug });
}

async function enrichPosts(
  rows: any[],
  overrideCategory?: { name: string; slug: string }
): Promise<HomePost[]> {
  if (!rows.length) return [];
  const mediaIds = rows.map((r) => r.featured_media_id).filter(Boolean);
  const authorIds = rows.map((r) => r.author_id).filter(Boolean);

  const [mediaRes, authorRes, pcRes] = await Promise.all([
    mediaIds.length
      ? supabaseAnon.from("media").select("id, url").in("id", mediaIds)
      : Promise.resolve({ data: [] as any[] }),
    authorIds.length
      ? supabaseAnon
          .from("authors")
          .select("id, display_name, slug, avatar_url")
          .in("id", authorIds)
      : Promise.resolve({ data: [] as any[] }),
    overrideCategory
      ? Promise.resolve({ data: [] as any[] })
      : supabaseAnon
          .from("post_categories")
          .select("post_id, category_id")
          .in(
            "post_id",
            rows.map((r) => r.id)
          ),
  ]);

  const mediaMap = new Map((mediaRes.data ?? []).map((m: any) => [m.id, m.url as string]));
  const authorMap = new Map(
    (authorRes.data ?? []).map((a: any) => [a.id, a])
  );

  let postCat = new Map<number, { name: string; slug: string }>();
  if (!overrideCategory) {
    const catIds = (pcRes.data ?? []).map((r: any) => r.category_id);
    const { data: cats } = catIds.length
      ? await supabaseAnon.from("categories").select("id, name, slug").in("id", catIds)
      : { data: [] as any[] };
    const catMap = new Map(
      (cats ?? []).map((c: any) => [c.id, { name: c.name as string, slug: c.slug as string }])
    );
    for (const pc of pcRes.data ?? []) {
      if (!postCat.has(pc.post_id)) {
        const c = catMap.get(pc.category_id);
        if (c) postCat.set(pc.post_id, c);
      }
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
      featured_image_url: resolvePostImageUrl(
        r.featured_media_id && mediaMap.get(r.featured_media_id),
        pickFirstImageSrc(r.content_html),
      ),
      author: a
        ? {
            id: a.id,
            display_name: a.display_name,
            slug: a.slug,
            avatar_url: rewriteLegacyUrl(a.avatar_url ?? "") || null,
          }
        : null,
      category: overrideCategory ?? postCat.get(r.id) ?? null,
    } as HomePost;
  });
}

export const getHomepage = createServerFn({ method: "GET" }).handler(async (): Promise<HomePayload> => {
  // 1. Most-recent 20 posts → ticker(15), hero(1), topStories(4)
  const { data: latest } = await supabaseAnon
    .from("posts")
    .select(
      "id, slug, title, excerpt, content_html, published_at, featured_media_id, author_id"
    )
    .eq("status", "publish")
    .eq("type", "post")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(20);

  const latestRows = (latest ?? []) as any[];
  const ticker = latestRows.slice(0, 15).map((r) => ({ slug: r.slug, title: r.title }));
  const heroEnriched = await enrichPosts(latestRows.slice(0, 5));
  const hero = heroEnriched[0] ?? null;
  const topStories = heroEnriched.slice(1, 5);

  const usedIds = new Set<number>(heroEnriched.map((p) => p.id));

  // 2. Section rows
  const sectionResults = await Promise.all(
    SECTION_DEFS.map((s) =>
      fetchPostsByCategorySlug(s.slug, 3, usedIds).then((posts) => ({ ...s, posts }))
    )
  );
  for (const s of sectionResults) for (const p of s.posts) usedIds.add(p.id);

  // 3. Crisis (dark feature)
  const crisisPosts = await fetchPostsByCategorySlug("crisis-pr", 3, usedIds);
  for (const p of crisisPosts) usedIds.add(p.id);

  // 4. Top authors
  const { data: authors } = await supabaseAnon
    .from("authors")
    .select("id, display_name, slug, avatar_url, bio, post_count")
    .order("post_count", { ascending: false, nullsFirst: false })
    .limit(4);
  const topAuthors: HomeAuthor[] = (authors ?? []).map((a: any) => ({
    id: a.id,
    display_name: a.display_name,
    slug: a.slug,
    avatar_url: rewriteLegacyUrl(a.avatar_url ?? "") || null,
    bio: a.bio,
    post_count: a.post_count ?? 0,
  }));

  // 5. Economy / corporate-pr feature (1 post)
  const economyArr = await fetchPostsByCategorySlug("corporate-pr", 1, usedIds);
  const economy = economyArr[0] ?? null;
  if (economy) usedIds.add(economy.id);

  // 6. Other news — 3 recent not yet shown
  const { data: extra } = await supabaseAnon
    .from("posts")
    .select(
      "id, slug, title, excerpt, content_html, published_at, featured_media_id, author_id"
    )
    .eq("status", "publish")
    .eq("type", "post")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(20);
  const otherCandidates = ((extra ?? []) as any[]).filter((r) => !usedIds.has(r.id)).slice(0, 3);
  const otherNews = await enrichPosts(otherCandidates);

  // 7. Footer menu (menu-2)
  const { data: menuRow } = await supabaseAnon
    .from("menus")
    .select("id")
    .eq("slug", "menu-2")
    .maybeSingle();
  let footerMenu: HomeMenuItem[] = [];
  if (menuRow?.id) {
    const { data: items } = await supabaseAnon
      .from("menu_items")
      .select("label, url, position, parent_id")
      .eq("menu_id", menuRow.id)
      .order("position", { ascending: true });
    footerMenu = (items ?? []).map((i: any) => ({
      label: String(i.label).replace(/&amp;/g, "&").replace(/&#0?38;/g, "&"),
      href: normalizeFooterUrl(i.url ?? "/"),
    }));
  }

  return {
    ticker,
    hero,
    topStories,
    sections: sectionResults,
    crisis: { title: "Crisis", slug: "crisis-pr", posts: crisisPosts },
    topAuthors,
    economy,
    otherNews,
    footerMenu,
  };
});
