import { supabaseAnon } from "@/integrations/supabase/client.anon.server";
import { pickFirstImageSrc, resolvePostImageUrl, rewriteLegacyHtml, rewriteLegacyUrl } from "@/lib/legacy-urls";
import { SITE_URL, SITEMAP_PAGE_SIZE } from "./seo.constants";

const XML_HEADER = `<?xml version="1.0" encoding="UTF-8"?>`;
const URLSET_OPEN = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;
const URLSET_CLOSE = `</urlset>`;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc: string, lastmod?: string | null, image?: string | null) {
  const parts = [`  <url>`, `    <loc>${esc(loc)}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${esc(new Date(lastmod).toISOString())}</lastmod>`);
  if (image) parts.push(`    <image:image><image:loc>${esc(image)}</image:loc></image:image>`);
  parts.push(`  </url>`);
  return parts.join("\n");
}

export const SITEMAP_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
};

export async function buildSitemapIndex(): Promise<string> {
  const [{ count: postCount }, { count: pageCount }, { count: catCount }, { count: authorCount }] =
    await Promise.all([
      supabaseAnon.from("posts").select("id", { count: "exact", head: true }).eq("status", "publish").eq("type", "post"),
      supabaseAnon.from("posts").select("id", { count: "exact", head: true }).eq("status", "publish").eq("type", "page"),
      supabaseAnon.from("categories").select("id", { count: "exact", head: true }),
      supabaseAnon.from("authors").select("id", { count: "exact", head: true }),
    ]);

  const now = new Date().toISOString();
  const entries: string[] = [];
  const postPages = Math.max(1, Math.ceil((postCount ?? 0) / SITEMAP_PAGE_SIZE));
  for (let i = 1; i <= postPages; i++) {
    entries.push(`  <sitemap><loc>${SITE_URL}/post-sitemap${i === 1 ? "" : i}.xml</loc><lastmod>${now}</lastmod></sitemap>`);
  }
  if ((pageCount ?? 0) > 0) entries.push(`  <sitemap><loc>${SITE_URL}/page-sitemap.xml</loc><lastmod>${now}</lastmod></sitemap>`);
  if ((catCount ?? 0) > 0) entries.push(`  <sitemap><loc>${SITE_URL}/category-sitemap.xml</loc><lastmod>${now}</lastmod></sitemap>`);
  // Tag archives are noindex — intentionally excluded from sitemap.
  if ((authorCount ?? 0) > 0) entries.push(`  <sitemap><loc>${SITE_URL}/author-sitemap.xml</loc><lastmod>${now}</lastmod></sitemap>`);

  return `${XML_HEADER}\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</sitemapindex>\n`;
}

export async function buildPostSitemap(page: number): Promise<string | null> {
  const from = (page - 1) * SITEMAP_PAGE_SIZE;
  const to = from + SITEMAP_PAGE_SIZE - 1;
  const { data: posts } = await supabaseAnon
    .from("posts")
    .select("slug, modified_at, published_at, featured_media_id, content_html")
    .eq("status", "publish")
    .eq("type", "post")
    .order("published_at", { ascending: false, nullsFirst: false })
    .range(from, to);
  if (!posts || posts.length === 0) return null;

  const mediaIds = posts.map((p: any) => p.featured_media_id).filter(Boolean);
  const { data: media } = mediaIds.length
    ? await supabaseAnon.from("media").select("id, url").in("id", mediaIds)
    : { data: [] as any[] };
  const mediaMap = new Map((media ?? []).map((m: any) => [m.id, m.url]));

  const urls = posts
    .filter((p: any) => isCleanSlug(p.slug))
    .map((p: any) =>
      urlEntry(
        `${SITE_URL}/${p.slug}/`,
        p.modified_at ?? p.published_at,
        resolvePostImageUrl(
          p.featured_media_id && mediaMap.get(p.featured_media_id),
          pickFirstImageSrc(p.content_html),
        ),
      ),
    );
  return `${XML_HEADER}\n${URLSET_OPEN}\n${urls.join("\n")}\n${URLSET_CLOSE}\n`;
}

export async function buildPageSitemap(): Promise<string> {
  const { data } = await supabaseAnon
    .from("posts")
    .select("slug, modified_at, published_at")
    .eq("status", "publish")
    .eq("type", "page")
    .order("modified_at", { ascending: false, nullsFirst: false });
  const urls = (data ?? []).map((p: any) => urlEntry(`${SITE_URL}/${p.slug}`, p.modified_at ?? p.published_at));
  return `${XML_HEADER}\n${URLSET_OPEN}\n${urls.join("\n")}\n${URLSET_CLOSE}\n`;
}

export async function buildTermSitemap(table: "categories" | "tags", prefix: "category" | "tag"): Promise<string> {
  const { data } = await supabaseAnon
    .from(table)
    .select("slug, updated_at")
    .order("updated_at", { ascending: false, nullsFirst: false });
  const urls = (data ?? []).map((t: any) => urlEntry(`${SITE_URL}/${prefix}/${t.slug}`, t.updated_at));
  return `${XML_HEADER}\n${URLSET_OPEN}\n${urls.join("\n")}\n${URLSET_CLOSE}\n`;
}

export async function buildAuthorSitemap(): Promise<string> {
  const { data } = await supabaseAnon
    .from("authors")
    .select("slug, updated_at")
    .order("updated_at", { ascending: false, nullsFirst: false });
  const urls = (data ?? []).map((a: any) => urlEntry(`${SITE_URL}/author/${a.slug}`, a.updated_at));
  return `${XML_HEADER}\n${URLSET_OPEN}\n${urls.join("\n")}\n${URLSET_CLOSE}\n`;
}

export async function buildRssFeed(): Promise<string> {
  const { data: posts } = await supabaseAnon
    .from("posts")
    .select("id, slug, title, excerpt, content_html, published_at, modified_at, author_id, featured_media_id")
    .eq("status", "publish")
    .eq("type", "post")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(10);

  const authorIds = (posts ?? []).map((p: any) => p.author_id).filter(Boolean);
  const postIds = (posts ?? []).map((p: any) => (p as any).id).filter(Boolean);

  const [authorRes, pcRes] = await Promise.all([
    authorIds.length
      ? supabaseAnon.from("authors").select("id, display_name, email").in("id", authorIds)
      : Promise.resolve({ data: [] as any[] }),
    postIds.length
      ? supabaseAnon.from("post_categories").select("post_id, category_id").in("post_id", postIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const catIds = ((pcRes as any).data ?? []).map((r: any) => r.category_id);
  const { data: cats } = catIds.length
    ? await supabaseAnon.from("categories").select("id, name, slug").in("id", catIds)
    : { data: [] as any[] };
  const catMap = new Map((cats ?? []).map((c: any) => [c.id, c]));
  const postCats = new Map<number, { name: string; slug: string }[]>();
  for (const pc of (pcRes as any).data ?? []) {
    const c = catMap.get(pc.category_id);
    if (!c) continue;
    const arr = postCats.get(pc.post_id) ?? [];
    arr.push(c);
    postCats.set(pc.post_id, arr);
  }
  const authorMap = new Map<number, { id: number; display_name: string; email: string | null }>(
    ((authorRes as any).data ?? []).map((a: any) => [a.id, a]),
  );

  const items = (posts ?? [])
    .map((p: any) => {
      const url = `${SITE_URL}/${p.slug}`;
      const author = p.author_id ? authorMap.get(p.author_id) : null;
      const creator = author ? esc(author.display_name) : "Editorial Team";
      const cats = (postCats.get(p.id) ?? [])
        .map((c) => `      <category>${esc(c.name)}</category>`)
        .join("\n");
      return [
        `    <item>`,
        `      <title>${esc(p.title)}</title>`,
        `      <link>${esc(url)}</link>`,
        `      <guid isPermaLink="true">${esc(url)}</guid>`,
        `      <pubDate>${new Date(p.published_at ?? Date.now()).toUTCString()}</pubDate>`,
        `      <dc:creator><![CDATA[${creator}]]></dc:creator>`,
        cats,
        `      <description><![CDATA[${p.excerpt ?? ""}]]></description>`,
        `      <content:encoded><![CDATA[${rewriteLegacyHtml(p.content_html ?? "")}]]></content:encoded>`,
        `    </item>`,
      ].filter(Boolean).join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Everything-PR</title>
    <link>${SITE_URL}/</link>
    <description>Public Relations News &amp; Analysis</description>
    <language>en-US</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed/" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}
