import { createFileRoute, notFound } from "@tanstack/react-router";
import { getArchive } from "@/serverFns/archives.functions";
import { getPillar, type PillarPayload } from "@/serverFns/pillars.functions";
import { fetchArchiveViaRpc } from "@/lib/archives.shared";
import { fetchPillarViaRpc } from "@/lib/pillars.shared";
import { supabase } from "@/integrations/supabase/client";
import { ArchiveView, type PageHref } from "@/components/site/ArchiveView";
import { PillarView } from "@/components/site/PillarView";
import { buildArchiveHead } from "@/serverFns/seo.head";

export const Route = createFileRoute("/category/$slug")({
  loader: async ({ params }) => {
    // Try pillar first — if a pillar exists for this slug, render the pillar page
    const pillar = typeof window !== "undefined"
      ? await fetchPillarViaRpc(supabase, params.slug, 1)
      : await getPillar({ data: { slug: params.slug, page: 1 } });
    if (pillar) return { kind: "pillar" as const, data: pillar };

    const data = typeof window !== "undefined"
      ? await fetchArchiveViaRpc(supabase, { kind: "category", slug: params.slug, page: 1 })
      : await getArchive({ data: { kind: "category", slug: params.slug, page: 1 } });
    if (!data) throw notFound();
    return { kind: "archive" as const, data };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "Category · Everything-PR" }] };
    if (loaderData.kind === "pillar") {
      const p = loaderData.data.pillar;
      const description = p.subtitle || `${p.title} — long-form guide and the latest coverage on Everything-PR.`;
      const meta = [
        { title: `${p.title} · Everything-PR` },
        { name: "description", content: description },
        { property: "og:title", content: p.title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
      ];
      if (p.hero_image_url) {
        meta.push({ property: "og:image", content: p.hero_image_url });
      }
      const scripts = p.schema_jsonld
        ? [{ type: "application/ld+json" as const, children: JSON.stringify(p.schema_jsonld) }]
        : [];
      return { meta, scripts };
    }
    return buildArchiveHead({
      kind: "category",
      termTitle: loaderData.data.header.title,
      termDescription: loaderData.data.header.subtitle,
      page: 1,
      totalItems: loaderData.data.totalItems,
      items: loaderData.data.items.map((i) => ({ title: i.title, slug: i.slug })),
      pathPrefix: `/category/${(params as { slug: string }).slug}`,
    });
  },
  component: CategoryArchive,
});

function CategoryArchive() {
  const loaderData = Route.useLoaderData() as
    | { kind: "pillar"; data: PillarPayload }
    | { kind: "archive"; data: any };
  const { slug } = Route.useParams();
  if (loaderData.kind === "pillar") return <PillarView data={loaderData.data} />;
  return (
    <ArchiveView
      data={loaderData.data}
      eyebrow="Category"
      buildHref={(p): PageHref => {
        if (p === 1) return { to: "/category/$slug", params: { slug } };
        return { to: "/category/$slug/page/$page", params: { slug, page: String(p) } };
      }}
    />
  );
}
