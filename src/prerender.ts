/**
 * Build-time URL collector for TanStack Start prerendering.
 *
 * Runs ONLY during `vite build`. Imports the service-role Supabase client
 * (build environment has EPR_SUPABASE_* env vars). Returns the page list
 * passed to tanstackStart({ pages }).
 *
 * Tiering: if total URL count exceeds MAX_PRERENDER, fall back to a
 * Tier-1-only set so the build stays under the runner's time budget.
 * Tier 2 (everything else) is served dynamically and edge-cached.
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import {
  PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  PUBLIC_SUPABASE_URL,
} from "./integrations/supabase/public-env";

const MAX_PRERENDER = 2500;
const ARCHIVE_PAGE_SIZE = 10; // mirrors src/server/archives.functions.ts PAGE_SIZE
const TAG_MIN_POSTS = 5;
const TIER1_TOP_BY_LINKS = 500;
const TIER1_TOP_RECENT = 100;
const TIER1_PAGINATION_PER_TERM = 3;

type Page = { path: string };

type CollectResult = {
  pages: Page[];
  redirects: Array<{ source: string; target: string; status: number }>;
  manifest: {
    tier: 1 | 2;
    counts: Record<string, number>;
    studyPages: string[];
    elapsedMs: number;
    indexingEnabled: boolean;
  };
};

function getBuildSupabase() {
  const url =
    process.env.EPR_SUPABASE_URL ||
    process.env.VITE_EPR_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    PUBLIC_SUPABASE_URL;
  const key =
    process.env.EPR_SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.EPR_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_EPR_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "[prerender] Supabase URL / key missing — required for build-time URL collection",
    );
  }
  if (!process.env.EPR_SUPABASE_SERVICE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[prerender] Service key not available; collecting public URLs with the publishable key");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const STUDY_SLUG_HINTS = [
  "ai-company-comms-study",
  "foreign-influence-pr-study",
  "ai-coding-tools-ai-visibility-index",
  "ai-visibility-index",
];

/** Fetch all rows of a builder in chunks to bypass Supabase's row cap.
 * If a page fails (e.g. statement timeout under RLS with the anon key),
 * log and return what we have so the build can continue. */
async function fetchAll<T>(
  build: () => { range: (a: number, b: number) => PromiseLike<{ data: unknown; error: unknown }> },
  label = "query",
  pageSize = 500,
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  while (true) {
    try {
      const { data, error } = await build().range(from, from + pageSize - 1);
      if (error) {
        console.warn(`[prerender] ${label} page from=${from} failed:`, (error as { message?: string })?.message ?? error);
        break;
      }
      const rows = (data ?? []) as T[];
      if (rows.length === 0) break;
      out.push(...rows);
      if (rows.length < pageSize) break;
      from += pageSize;
    } catch (e) {
      console.warn(`[prerender] ${label} page from=${from} threw:`, (e as Error)?.message ?? e);
      break;
    }
  }
  return out;
}

export async function collectUrls(): Promise<CollectResult> {
  const start = Date.now();
  const sb = getBuildSupabase();
  const idxRaw = (process.env.INDEXING_ENABLED ?? process.env.EPR_INDEXING_ENABLED ?? "").toLowerCase();
  const indexingEnabled = idxRaw === "true" || idxRaw === "1";

  // ---- raw fetches (parallel) ----
  const [
    posts,
    categories,
    tags,
    authors,
    redirectsRows,
    internalLinks,
    postCount,
  ] = await Promise.all([
    fetchAll<{ id: number; slug: string; type: string; published_at: string | null }>(
      () =>
        sb
          .from("posts")
          .select("id,slug,type,published_at")
          .eq("status", "publish")
          .in("type", ["post", "page"])
          .order("published_at", { ascending: false, nullsFirst: false }),
      "posts",
    ),
    fetchAll<{ id: number; slug: string; post_count: number }>(
      () => sb.from("categories").select("id,slug,post_count"),
      "categories",
    ),
    fetchAll<{ id: number; slug: string; post_count: number }>(
      () => sb.from("tags").select("id,slug,post_count").gte("post_count", TAG_MIN_POSTS),
      "tags",
    ),
    fetchAll<{ id: number; slug: string }>(
      () => sb.from("authors").select("id,slug"),
      "authors",
    ),
    fetchAll<{ source_path: string; target_path: string; status_code: number }>(
      () =>
        sb
          .from("redirects")
          .select("source_path,target_path,status_code")
          .eq("enabled", true),
      "redirects",
    ),
    fetchAll<{ target_post_id: number | null }>(
      () => sb.from("internal_links").select("target_post_id"),
      "internal_links",
    ),
    sb
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "publish")
      .eq("type", "post"),
  ]);

  // ---- derived sets ----
  const slugPages = posts.map((p) => `/${p.slug}`);
  const studyPages = posts
    .filter((p) =>
      STUDY_SLUG_HINTS.some((h) => p.slug.includes(h)),
    )
    .map((p) => `/${p.slug}`);

  const pagePosts = posts.filter((p) => p.type === "page").map((p) => `/${p.slug}`);
  const newsPosts = posts
    .filter((p) => p.type === "post")
    .sort(
      (a, b) =>
        (b.published_at ? +new Date(b.published_at) : 0) -
        (a.published_at ? +new Date(a.published_at) : 0),
    );

  // category pagination
  const categoryUrls: string[] = [];
  for (const c of categories) {
    categoryUrls.push(`/category/${c.slug}`);
    const pages = Math.min(
      Math.ceil((c.post_count || 0) / ARCHIVE_PAGE_SIZE),
      999,
    );
    for (let n = 2; n <= pages; n++) {
      categoryUrls.push(`/category/${c.slug}/page/${n}`);
    }
  }

  const tagUrls: string[] = [];
  for (const t of tags) {
    tagUrls.push(`/tag/${t.slug}`);
    const pages = Math.min(
      Math.ceil((t.post_count || 0) / ARCHIVE_PAGE_SIZE),
      999,
    );
    for (let n = 2; n <= pages; n++) tagUrls.push(`/tag/${t.slug}/page/${n}`);
  }

  const authorUrls: string[] = [];
  for (const a of authors) authorUrls.push(`/author/${a.slug}`);

  // Sitemaps and the RSS feed are written as static XML files by
  // scripts/generate-sitemaps.ts after the prerender pass. robots.txt lives in
  // public/robots.txt and is copied as a static text file during the build.
  // Keep these OUT of the prerender URL list so we don't end up with HTML at
  // those paths.
  const sitemapUrls: string[] = [];
  void postCount; // referenced to keep parallel fetch typed; sitemap script re-counts

  const utilityUrls = ["/feed"];

  const allUrls = unique([
    "/",
    ...slugPages,
    ...categoryUrls,
    ...tagUrls,
    ...authorUrls,
    ...sitemapUrls,
    ...utilityUrls,
  ]).map(withTrailingSlash);

  // ---- tier decision ----
  let tier: 1 | 2 = 2;
  let chosen: string[] = allUrls;
  if (allUrls.length > MAX_PRERENDER) {
    tier = 1;
    // tier-1 set
    const linkCounts = new Map<number, number>();
    for (const r of internalLinks) {
      if (r.target_post_id == null) continue;
      linkCounts.set(r.target_post_id, (linkCounts.get(r.target_post_id) ?? 0) + 1);
    }
    const topByLinks = [...posts]
      .filter((p) => p.type === "post")
      .sort(
        (a, b) => (linkCounts.get(b.id) ?? 0) - (linkCounts.get(a.id) ?? 0),
      )
      .slice(0, TIER1_TOP_BY_LINKS)
      .map((p) => `/${p.slug}`);
    const topRecent = newsPosts
      .slice(0, TIER1_TOP_RECENT)
      .map((p) => `/${p.slug}`);

    const limitedCategoryUrls: string[] = [];
    for (const c of categories) {
      limitedCategoryUrls.push(`/category/${c.slug}`);
      for (let n = 2; n <= 1 + TIER1_PAGINATION_PER_TERM; n++) {
        if ((c.post_count || 0) > (n - 1) * ARCHIVE_PAGE_SIZE)
          limitedCategoryUrls.push(`/category/${c.slug}/page/${n}`);
      }
    }
    const limitedAuthorUrls: string[] = [];
    for (const a of authors) {
      limitedAuthorUrls.push(`/author/${a.slug}`);
      for (let n = 2; n <= 1 + TIER1_PAGINATION_PER_TERM; n++) {
        limitedAuthorUrls.push(`/author/${a.slug}/page/${n}`);
      }
    }

    chosen = unique([
      "/",
      ...pagePosts,
      ...topByLinks,
      ...topRecent,
      ...limitedCategoryUrls,
      ...limitedAuthorUrls,
      ...sitemapUrls,
      ...utilityUrls,
    ]).map(withTrailingSlash);
  }

  const result: CollectResult = {
    pages: chosen.map((p) => ({ path: p })),
    redirects: redirectsRows.map((r) => ({
      source: r.source_path,
      target: r.target_path,
      status: r.status_code || 301,
    })),
    manifest: {
      tier,
      counts: {
        total_collected: allUrls.length,
        prerendered: chosen.length,
        posts: posts.length,
        pages_type: pagePosts.length,
        categories: categories.length,
        tags: tags.length,
        authors: authors.length,
        redirects: redirectsRows.length,
      },
      studyPages,
      elapsedMs: Date.now() - start,
      indexingEnabled,
    },
  };

  // write debug manifest + redirect map
  // - dist/* for build inspection
  // - src/generated/redirects.json so the Worker can import it (bundled)
  try {
    const distDir = path.resolve(process.cwd(), "dist");
    mkdirSync(distDir, { recursive: true });
    writeFileSync(
      path.join(distDir, "prerender-manifest.json"),
      JSON.stringify(result.manifest, null, 2),
    );
    writeFileSync(
      path.join(distDir, "_redirects.json"),
      JSON.stringify(result.redirects),
    );
    const genDir = path.resolve(process.cwd(), "src/generated");
    mkdirSync(genDir, { recursive: true });
    writeFileSync(
      path.join(genDir, "redirects.json"),
      JSON.stringify(result.redirects),
    );
  } catch (e) {
    console.warn("[prerender] failed to write manifest:", e);
  }

  // build log
  const m = result.manifest;
  console.log(
    `[prerender] tier=${m.tier} prerendered=${m.counts.prerendered} ` +
      `total=${m.counts.total_collected} posts=${m.counts.posts} ` +
      `pages=${m.counts.pages_type} cats=${m.counts.categories} ` +
      `tags=${m.counts.tags} authors=${m.counts.authors} ` +
      `redirects=${m.counts.redirects} indexing=${m.indexingEnabled} ` +
      `in ${m.elapsedMs}ms`,
  );
  if (studyPages.length) {
    console.log(`[prerender] study pages included: ${studyPages.join(", ")}`);
  } else {
    console.warn(
      "[prerender] WARNING: no study landing pages matched STUDY_SLUG_HINTS",
    );
  }

  return result;
}

function unique(arr: string[]): string[] {
  return Array.from(new Set(arr));
}
