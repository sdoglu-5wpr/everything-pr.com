import { createFileRoute, notFound } from "@tanstack/react-router";
import { getArchive } from "@/server/archives.functions";
import { ArchiveView } from "@/components/site/ArchiveView";

export const Route = createFileRoute("/category/$slug")({
  loader: async ({ params }) => {
    const data = await getArchive({ data: { kind: "category", slug: params.slug, page: 1 } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Category · Everything-PR" }] };
    const title = `${loaderData.header.title} · Everything-PR`;
    const description =
      loaderData.header.subtitle || `Latest ${loaderData.header.title} articles from Everything-PR.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: loaderData.header.title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
      ],
    };
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
      buildHref={(p) =>
        p === 1
          ? { to: "/category/$slug", params: { slug } }
          : { to: "/category/$slug/page/$page", params: { slug, page: String(p) } }
      }
    />
  );
}
