import { createFileRoute, notFound } from "@tanstack/react-router";
import { getArchive } from "@/serverFns/archives.functions";
import { ArchiveView, type PageHref } from "@/components/site/ArchiveView";
import { buildArchiveHead } from "@/serverFns/seo.head";

export const Route = createFileRoute("/category/$slug/page/$page")({
  loader: async ({ params }) => {
    const page = parseInt(params.page, 10);
    if (!Number.isFinite(page) || page < 1) throw notFound();
    const data = await getArchive({ data: { kind: "category", slug: params.slug, page } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "Category · Everything-PR" }] };
    const p = params as { slug: string; page: string };
    return buildArchiveHead({
      kind: "category",
      termTitle: loaderData.header.title,
      termDescription: loaderData.header.subtitle,
      page: loaderData.page,
      totalItems: loaderData.totalItems,
      items: loaderData.items.map((i) => ({ title: i.title, slug: i.slug })),
      pathPrefix: `/category/${p.slug}`,
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
      eyebrow="Category"
      buildHref={(p): PageHref => {
        if (p === 1) return { to: "/category/$slug", params: { slug } };
        return { to: "/category/$slug/page/$page", params: { slug, page: String(p) } };
      }}
    />
  );
}
