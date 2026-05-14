import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { GlossaryHub } from "@/components/site/GlossaryHub";
import { listGlossary } from "@/serverFns/glossary.functions";
import { isPreviewHost } from "@/serverFns/seo.head";
import { SITE_URL, SITE_NAME, ORG_JSONLD, DEFAULT_OG_IMAGE, TWITTER_HANDLE } from "@/serverFns/seo.constants";

const URL = `${SITE_URL}/glossary`;
const TITLE = "Glossary — The Communications & Marketing Reference Index — Everything-PR";
const DESCRIPTION =
  "The industry's reference index for communications and marketing terminology — from GEO and AEO to FARA, NIL, SEC 8-K, citation share, retrieval anchor, and 200+ more.";

export const Route = createFileRoute("/glossary")({
  loader: async () => {
    const data = await listGlossary();
    return data;
  },
  head: ({ loaderData }) => {
    const preview = isPreviewHost(loaderData?.host);
    const robots = preview
      ? "noindex, follow, max-image-preview:large"
      : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
    const terms = loaderData?.terms ?? [];
    const collectionPage = {
      "@type": "CollectionPage",
      "@id": `${URL}#webpage`,
      url: URL,
      name: TITLE,
      description: DESCRIPTION,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-US",
      mainEntity: {
        "@type": "DefinedTermSet",
        "@id": `${URL}#termset`,
        name: "Everything-PR Glossary",
        url: URL,
        hasDefinedTerm: terms.map((t) => ({ "@id": `${SITE_URL}/glossary/${t.slug}#term` })),
      },
    };
    const breadcrumb = {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Glossary", item: URL },
      ],
    };
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESCRIPTION },
        { name: "robots", content: robots },
        { property: "og:locale", content: "en_US" },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESCRIPTION },
        { property: "og:type", content: "website" },
        { property: "og:url", content: URL },
        { property: "og:site_name", content: SITE_NAME },
        { property: "og:image", content: DEFAULT_OG_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: TWITTER_HANDLE },
        { name: "twitter:title", content: TITLE },
        { name: "twitter:description", content: DESCRIPTION },
      ],
      links: [{ rel: "canonical", href: URL }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({ "@context": "https://schema.org", "@graph": [ORG_JSONLD, collectionPage, breadcrumb] }),
        },
      ],
    };
  },
  component: function GlossaryRoute() {
    const { terms } = Route.useLoaderData();
    if (!terms || terms.length === 0) {
      // Render empty hub gracefully (still SEO-valid)
      return (
        <SiteLayout>
          <GlossaryHub terms={[]} />
        </SiteLayout>
      );
    }
    return (
      <SiteLayout>
        <GlossaryHub terms={terms} />
      </SiteLayout>
    );
  },
});
