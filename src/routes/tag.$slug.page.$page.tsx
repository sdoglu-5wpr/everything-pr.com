import { createFileRoute, notFound } from "@tanstack/react-router";
import { getArchive } from "@/serverFns/archives.functions";
import { ArchiveView, type PageHref } from "@/components/site/ArchiveView";

export const Route = createFileRoute("/tag/$slug/page/$page")({
  loader: async ({ params }) => {
    const page = parseInt(params.page, 10);
    if (!Number.isFinite(page) || page < 1) throw notFound();
    const data = await getArchive({ data: { kind: "tag", slug: params.slug, page } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.header.title} — Page ${loaderData.page} · Everything-PR` : "Tag" }],
  }),
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
