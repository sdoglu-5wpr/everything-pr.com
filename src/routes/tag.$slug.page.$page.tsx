import { createFileRoute, notFound } from "@tanstack/react-router";
import { getArchive } from "@/serverFns/archives.functions";
import { fetchArchiveViaRpc } from "@/lib/archives.shared";
import { supabase } from "@/integrations/supabase/client";
import { ArchiveView, type PageHref } from "@/components/site/ArchiveView";
import { buildArchiveHead } from "@/serverFns/seo.head";

export const Route = createFileRoute("/tag/$slug/page/$page")({
  loader: async ({ params }) => {
    const page = parseInt(params.page, 10);
    if (!Number.isFinite(page) || page < 1) throw notFound();
    const data =
      typeof window !== "undefined"
        ? await fetchArchiveViaRpc(supabase, { kind: "tag", slug: params.slug, page })
        : await getArchive({ data: { kind: "tag", slug: params.slug, page } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "Tag" }] };
    return buildArchiveHead({
      kind: "tag",
      termTitle: loaderData.header.title,
      termDescription: loaderData.header.subtitle,
      page: loaderData.page ?? 1,
      totalItems: loaderData.totalItems,
      items: loaderData.items.map((i) => ({ title: i.title, slug: i.slug })),
      pathPrefix: `/tag/${(params as { slug: string }).slug}`,
      seoOverrides: loaderData.header.seo,
    });
  },
  component: Page,
});

function Page() {
  const data = Route.useLoaderData();
  const { slug } = Route.useParams();
  return (
    <ArchiveView
      data={data}
      eyebrow="Tag"
      buildHref={(p): PageHref => {
        if (p === 1) return { to: "/tag/$slug", params: { slug } };
        return { to: "/tag/$slug/page/$page", params: { slug, page: String(p) } };
      }}
    />
  );
}
