import { createFileRoute, notFound } from "@tanstack/react-router";
import { getArchive } from "@/serverFns/archives.functions";
import { ArchiveView, type PageHref } from "@/components/site/ArchiveView";
import { buildArchiveHead } from "@/serverFns/seo.head";

export const Route = createFileRoute("/tag/$slug")({
  loader: async ({ params }) => {
    const data = await getArchive({ data: { kind: "tag", slug: params.slug, page: 1 } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "Tag · Everything-PR" }] };
    return buildArchiveHead({
      kind: "tag",
      termTitle: loaderData.header.title,
      termDescription: loaderData.header.subtitle,
      page: 1,
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
