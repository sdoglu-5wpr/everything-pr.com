import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader, getRequestHost } from "@tanstack/react-start/server";
import { supabaseAnon } from "@/integrations/supabase/client.anon.server";
import { PillarView } from "@/components/site/PillarView";
import { resolvePostImageUrl, rewriteLegacyUrl } from "@/lib/legacy-urls";
import type { PillarPayload, PillarArticleItem } from "@/lib/pillars.shared";
import { buildPillarHead } from "@/serverFns/seo.head";

const PAGE_SIZE = 12;

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
});

const getResearchPillar = createServerFn({ method: "GET" })
  .inputValidator((input: { page?: number }) => input)
  .handler(async ({ data }): Promise<PillarPayload | null> => {
    let host: string | null = null;
    try { host = getRequestHost({ xForwardedHost: true }) ?? null; } catch {}
    try {
      setResponseHeader(
        "Cache-Control",
        "public, max-age=120, s-maxage=300, stale-while-revalidate=600",
      );
    } catch {}
    const page = Math.max(1, Math.floor(Number(data?.page ?? 1)));

    const { data: pillarRow, error: pillarErr } = await (supabaseAnon as any)
      .from("pillars")
      .select("id, slug, title, subtitle, byline, body_html, schema_jsonld, faq, hero_image_url, robots")
      .eq("slug", "research")
      .eq("published", true)
      .maybeSingle();
    if (pillarErr || !pillarRow) {
      console.error("research pillar fetch failed:", pillarErr);
      return null;
    }

    // Items: all posts flagged article_type='research' across topical pillars,
    // newest first (the live research catalog feed under the editorial body).
    const { data: rpc } = await (supabaseAnon as any).rpc("get_research_list", {
      p_page: page,
      p_page_size: PAGE_SIZE,
    });
    const total = Number(rpc?.total ?? 0);
    const items: PillarArticleItem[] = ((rpc?.items ?? []) as any[]).map((r) => ({
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
      author: r.author
        ? { id: r.author.id, display_name: r.author.display_name, slug: r.author.slug }
        : null,
      category: r.category ?? null,
    }));

    return {
      pillar: {
        id: pillarRow.id,
        slug: pillarRow.slug,
        title: pillarRow.title,
        subtitle: pillarRow.subtitle ?? null,
        byline: pillarRow.byline ?? null,
        body_html: pillarRow.body_html ?? "",
        schema_jsonld: pillarRow.schema_jsonld ?? null,
        faq: Array.isArray(pillarRow.faq) ? pillarRow.faq : [],
        hero_image_url: rewriteLegacyUrl(pillarRow.hero_image_url ?? "") || null,
        robots: pillarRow.robots ?? null,
      },
      total,
      page,
      pageSize: PAGE_SIZE,
      items,
      longForm: [],
      host,
    };
  });

export const Route = createFileRoute("/research")({
  validateSearch: (s) => searchSchema.parse(s),
  search: { middlewares: [stripSearchParams({ page: 1 }) as any] },
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ deps }) => getResearchPillar({ data: { page: deps.page } }),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Research · Everything-PR" }] };
    }
    return buildPillarHead({
      slug: loaderData.pillar.slug,
      title: loaderData.pillar.title,
      subtitle: loaderData.pillar.subtitle,
      heroImage: loaderData.pillar.hero_image_url,
      page: loaderData.page,
      totalItems: loaderData.total,
      items: loaderData.items.map((i) => ({ title: i.title, slug: i.slug })),
      faq: loaderData.pillar.faq,
      robots: loaderData.pillar.robots,
      host: loaderData.host ?? null,
    });
  },
  component: Page,
});

function Page() {
  const data = Route.useLoaderData();
  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-3xl font-serif font-bold">Research</h1>
        <p className="text-muted-foreground mt-4">Loading…</p>
      </div>
    );
  }
  return <PillarView data={data} />;
}
