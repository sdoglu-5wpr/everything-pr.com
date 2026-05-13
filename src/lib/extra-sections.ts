// Client-side fetch for "Trending" + 2 rotating category sections shown
// on the homepage and article template page. Uses the existing
// get_archive_list RPC so no schema changes are required.
import { supabase } from "@/integrations/supabase/client";
import { resolvePostImageUrl, rewriteLegacyUrl } from "@/lib/legacy-urls";

export type ExtraPost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
  featured_image_url: string | null;
  author: { display_name: string; slug: string; avatar_url: string | null } | null;
  category: { name: string; slug: string } | null;
};

export type ExtraSection = {
  title: string;
  categorySlug: string;
  categoryName: string;
  posts: ExtraPost[];
};

export type ExtraSectionsPayload = {
  trending: ExtraPost[];
  sections: ExtraSection[];
};

// Curated rotation pool — categories with healthy article counts and
// editorial relevance.
const ROTATION_POOL: { slug: string; name: string }[] = [
  { slug: "corporate-pr", name: "Corporate PR" },
  { slug: "technology-pr", name: "Technology PR" },
  { slug: "consumer-pr", name: "Consumer PR" },
  { slug: "entertainment-pr", name: "Entertainment PR" },
  { slug: "healthcare-pr", name: "Healthcare PR" },
  { slug: "beauty", name: "Beauty" },
  { slug: "digital-pr", name: "Digital PR" },
  { slug: "ai-communications", name: "AI Communications" },
  { slug: "ai-pr", name: "AI PR" },
  { slug: "social-media", name: "Social Media" },
  { slug: "crisis-pr", name: "Crisis PR" },
  { slug: "pr-leaders", name: "PR Leaders" },
  { slug: "agency-of-record", name: "Agency of Record" },
  { slug: "marketing", name: "Marketing" },
  { slug: "pr-firms", name: "PR Firms" },
  { slug: "pr-insights", name: "PR Insights" },
];

function rotate<T>(arr: T[], offset: number): T[] {
  if (!arr.length) return arr;
  const o = ((offset % arr.length) + arr.length) % arr.length;
  return arr.slice(o).concat(arr.slice(0, o));
}

function dayOfYearSeed(): number {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  return Math.floor((now.getTime() - start) / 86_400_000);
}

function rowToPost(r: any, fallbackCategory?: { name: string; slug: string }): ExtraPost {
  const a = r.author ?? null;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt ?? null,
    published_at: r.published_at,
    featured_image_url: resolvePostImageUrl(
      r.media_url,
      r.content_html ? rewriteLegacyUrl(r.content_html) : null,
      r.og_image,
    ),
    author: a
      ? {
          display_name: a.display_name,
          slug: a.slug,
          avatar_url: rewriteLegacyUrl(a.avatar_url ?? "") || null,
        }
      : null,
    category: r.category ?? fallbackCategory ?? null,
  };
}

async function fetchCategoryPosts(slug: string, name: string, limit: number): Promise<ExtraPost[]> {
  const { data, error } = await (supabase as any).rpc("get_archive_list", {
    p_kind: "category",
    p_slug: slug,
    p_page: 1,
    p_page_size: limit,
  });
  if (error || !data) return [];
  return ((data.items ?? []) as any[]).map((r) => rowToPost(r, { name, slug }));
}

export async function fetchExtraSections(opts?: {
  excludeSlugs?: string[];
  trendingLimit?: number;
  sectionLimit?: number;
}): Promise<ExtraSectionsPayload> {
  const exclude = new Set((opts?.excludeSlugs ?? []).filter(Boolean));
  const trendingLimit = opts?.trendingLimit ?? 5;
  const sectionLimit = opts?.sectionLimit ?? 3;

  // Pick 2 rotating categories from the pool, excluding any to avoid.
  const pool = ROTATION_POOL.filter((c) => !exclude.has(c.slug));
  const rotated = rotate(pool, dayOfYearSeed());
  const picks = rotated.slice(0, 2);

  const [trending, ...sectionResults] = await Promise.all([
    fetchCategoryPosts("trending", "Trending", trendingLimit),
    ...picks.map((p) => fetchCategoryPosts(p.slug, p.name, sectionLimit)),
  ]);

  const sectionTitles = ["Other News", "Hot Topic"];
  const sections: ExtraSection[] = picks.map((p, i) => ({
    title: sectionTitles[i] ?? p.name,
    categorySlug: p.slug,
    categoryName: p.name,
    posts: sectionResults[i] ?? [],
  }));

  return { trending, sections };
}
