import { createFileRoute, notFound } from "@tanstack/react-router";
import { getArchive } from "@/serverFns/archives.functions";
import { fetchArchiveViaRpc } from "@/lib/archives.shared";
import { supabase } from "@/integrations/supabase/client";
import { AuthorPage } from "@/components/site/AuthorPage";
import { buildArchiveHead } from "@/serverFns/seo.head";

export const Route = createFileRoute("/author/$slug")({
  loader: async ({ params }) => {
    const data =
      typeof window !== "undefined"
        ? await fetchArchiveViaRpc(supabase, { kind: "author", slug: params.slug, page: 1 })
        : await getArchive({ data: { kind: "author", slug: params.slug, page: 1 } });
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
      author: loaderData.header.author,
    });
  },
  component: Page,
});

function Page() {
  const data = Route.useLoaderData();
  return <AuthorPage data={data} />;
}
