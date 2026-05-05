import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getArchive } from "@/serverFns/archives.functions";
import { ArchiveView, type PageHref } from "@/components/site/ArchiveView";
import { buildArchiveHead } from "@/serverFns/seo.head";

const searchSchema = z.object({
  s: z.string().optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export const Route = createFileRoute("/search")({
  validateSearch: (s) => searchSchema.parse(s),
  loaderDeps: ({ search }) => ({ s: search.s, page: search.page }),
  loader: async ({ deps }) => {
    return await getArchive({ data: { kind: "search", q: deps.s, page: deps.page } });
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Search · Everything-PR" }] };
    return buildArchiveHead({
      kind: "search",
      termTitle: loaderData.header.title,
      termDescription: loaderData.header.subtitle,
      page: loaderData.page,
      totalItems: loaderData.totalItems,
      items: loaderData.items.map((i) => ({ title: i.title, slug: i.slug })),
      pathPrefix: "/search",
      searchPhrase: loaderData.header.title,
    });
  },
  component: Page,
});

function Page() {
  const data = Route.useLoaderData()!;
  const { s } = Route.useSearch();
  return (
    <ArchiveView
      data={data}
      eyebrow="Search"
      buildHref={(p): PageHref => ({ to: "/search", search: { s, page: p } })}
    />
  );
}
