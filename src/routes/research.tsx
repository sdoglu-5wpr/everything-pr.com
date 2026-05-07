import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { supabaseAnon } from "@/integrations/supabase/client.anon.server";
import { ArchiveView, type PageHref } from "@/components/site/ArchiveView";
import type { ArchivePayload, ArchiveItem } from "@/serverFns/archives.functions";
import { resolvePostImageUrl, rewriteLegacyUrl } from "@/lib/legacy-urls";
import { buildStaticPageHead } from "@/serverFns/seo.head";

const PAGE_SIZE = 12;

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
});

const getResearch = createServerFn({ method: "GET" })
  .inputValidator((input: { page?: number }) => input)
  .handler(async ({ data }): Promise<ArchivePayload> => {
    try {
      setResponseHeader(
        "Cache-Control",
        "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
      );
    } catch {}
    const page = Math.max(1, Math.floor(Number(data?.page ?? 1)));
    const { data: rpc, error } = await (supabaseAnon as any).rpc("get_research_list", {
      p_page: page,
      p_page_size: PAGE_SIZE,
    });
    if (error || !rpc) {
      console.error("get_research_list failed:", error);
      return {
        header: { kind: "category", title: "Research", subtitle: null },
        items: [],
        page,
        totalItems: 0,
        totalPages: 1,
      };
    }
    const total = Number(rpc.total ?? 0);
    const items: ArchiveItem[] = ((rpc.items ?? []) as any[]).map((r) => ({
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
      header: {
        kind: "category",
        title: "Research",
        subtitle: total
          ? `${total} studies, surveys & reports across PR, marketing & comms`
          : null,
      },
      items,
      page,
      totalItems: total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  });

export const Route = createFileRoute("/research")({
  validateSearch: (s) => searchSchema.parse(s),
  search: { middlewares: [stripSearchParams({ page: 1 }) as any] },
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ deps }) => getResearch({ data: { page: deps.page } }),
  head: ({ loaderData }) =>
    buildStaticPageHead({
      path: "/research/",
      title: "Research, Studies & Reports · Everything-PR",
      description:
        loaderData?.totalItems
          ? `${loaderData.totalItems} research articles, studies, surveys, and industry reports on public relations, marketing, comms, and the business of media from Everything-PR.`
          : "Browse Everything-PR's research, studies, surveys, and industry reports on public relations, marketing, comms, and the business of media.",
      breadcrumbs: [{ name: "Research" }],
    }),
  component: Page,
});

function Page() {
  const data = Route.useLoaderData();
  return (
    <ArchiveView
      data={data}
      eyebrow="Research"
      buildHref={(p): PageHref => ({ to: "/research", search: { page: p } })}
    />
  );
}
