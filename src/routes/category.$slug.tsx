import { createFileRoute, notFound } from "@tanstack/react-router";
import { getArchive } from "@/serverFns/archives.functions";
import { ArchiveView, type PageHref } from "@/components/site/ArchiveView";
import { buildArchiveHead } from "@/serverFns/seo.head";

export const Route = createFileRoute("/category/$slug")({
  loader: async ({ params }) => {
    const data = await getArchive({ data: { kind: "category", slug: params.slug, page: 1 } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "Category · Everything-PR" }] };
    return buildArchiveHead({
      kind: "category",
      termTitle: loaderData.header.title,
      termDescription: loaderData.header.subtitle,
      page: 1,
      totalItems: loaderData.totalItems,
      items: loaderData.items.map((i) => ({ title: i.title, slug: i.slug })),
      pathPrefix: `/category/${(params as { slug: string }).slug}`,
    });
  },
  component: CategoryArchive,
});

function CategoryArchive() {
  const data = Route.useLoaderData();
  const { slug } = Route.useParams();
  return (
    <ArchiveView
      data={data}
      eyebrow="Category"
      buildHref={(p): PageHref => {
        if (p === 1) return { to: "/category/$slug", params: { slug } };
        return { to: "/category/$slug/page/$page", params: { slug, page: String(p) } };
      }}
    />
  );
}
