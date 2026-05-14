import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { GlossaryTermPage } from "@/components/site/GlossaryTermPage";
import { getGlossaryTerm } from "@/serverFns/glossary.functions";
import { isPreviewHost } from "@/serverFns/seo.head";
import { SITE_URL, SITE_NAME, ORG_JSONLD, DEFAULT_OG_IMAGE, TWITTER_HANDLE } from "@/serverFns/seo.constants";

function truncate(s: string, n = 160) {
  const c = (s || "").replace(/\s+/g, " ").trim();
  return c.length <= n ? c : c.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
}

export const Route = createFileRoute("/glossary/$slug")({
  loader: async ({ params }) => {
    const data = await getGlossaryTerm({ data: { slug: params.slug } });
    if (!data?.term) throw notFound();
    return data;
  },
  head: ({ params, loaderData }) => {
    const term = loaderData?.term;
    const url = `${SITE_URL}/glossary/${params.slug}`;
    const title = term ? `${term.title} — Glossary — Everything-PR` : "Glossary — Everything-PR";
    const description = term ? truncate(term.short_definition) : "";
    const preview = isPreviewHost(loaderData?.host);
    const robots = preview
      ? "noindex, follow, max-image-preview:large"
      : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

    const definedTerm = term
      ? {
          "@type": "DefinedTerm",
          "@id": `${url}#term`,
          name: term.title,
          description: term.short_definition,
          url,
          inDefinedTermSet: {
            "@type": "DefinedTermSet",
            name: "Everything-PR Glossary",
            url: `${SITE_URL}/glossary`,
          },
        }
      : null;
    const breadcrumb = {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Glossary", item: `${SITE_URL}/glossary` },
        { "@type": "ListItem", position: 3, name: term?.title ?? params.slug },
      ],
    };
    const graph: unknown[] = [ORG_JSONLD, breadcrumb];
    if (definedTerm) graph.unshift(definedTerm);

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: robots },
        { property: "og:locale", content: "en_US" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:site_name", content: SITE_NAME },
        { property: "og:image", content: DEFAULT_OG_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: TWITTER_HANDLE },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="font-serif text-4xl font-bold">Term not found</h1>
        <p className="mt-4 text-muted-foreground">That glossary entry doesn't exist (yet).</p>
        <a href="/glossary" className="mt-6 inline-block text-brand-blue hover:underline">← Browse the Glossary</a>
      </div>
    </SiteLayout>
  ),
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="font-serif text-3xl font-bold">Something went wrong</h1>
        <p className="mt-4 text-muted-foreground">{error.message}</p>
      </div>
    </SiteLayout>
  ),
  component: function GlossaryTermRoute() {
    const { term } = Route.useLoaderData();
    if (!term) return null;
    return (
      <SiteLayout>
        <GlossaryTermPage term={term} />
      </SiteLayout>
    );
  },
});
