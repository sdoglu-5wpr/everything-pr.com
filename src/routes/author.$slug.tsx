import { createFileRoute, notFound } from "@tanstack/react-router";
import { getArchive } from "@/serverFns/archives.functions";
import { ArchiveView, type PageHref } from "@/components/site/ArchiveView";
import { buildArchiveHead } from "@/serverFns/seo.head";

export const Route = createFileRoute("/author/$slug")({
  loader: async ({ params }) => {
    const data = await getArchive({ data: { kind: "author", slug: params.slug, page: 1 } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "Author · Everything-PR" }] };
    return buildArchiveHead({
      kind: "author",
      termTitle: loaderData.header.title,
      termDescription: loaderData.header.subtitle,
      page: 1,
      totalItems: loaderData.totalItems,
      items: loaderData.items.map((i) => ({ title: i.title, slug: i.slug })),
      pathPrefix: `/author/${(params as { slug: string }).slug}`,
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
      eyebrow="Author"
      buildHref={(p): PageHref => {
        if (p === 1) return { to: "/author/$slug", params: { slug } };
        return { to: "/author/$slug/page/$page", params: { slug, page: String(p) } };
      }}
    />
  );
}
