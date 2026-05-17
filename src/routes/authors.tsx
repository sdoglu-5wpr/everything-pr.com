import { createFileRoute } from "@tanstack/react-router";
import { listAuthors } from "@/serverFns/authors.functions";
import { AuthorsIndex } from "@/components/site/AuthorsIndex";
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE, TWITTER_HANDLE } from "@/serverFns/seo.constants";

const TITLE = "Contributors — Everything-PR";
const DESCRIPTION =
  "Meet the reporters, analysts, and industry leaders writing for Everything-PR — communications, reputation, AI visibility, public affairs, and the answer-engine era.";
const URL = `${SITE_URL}/authors`;

export const Route = createFileRoute("/authors")({
  loader: async () => listAuthors(),
  head: ({ loaderData }) => {
    const authors = loaderData ?? [];
    const collection = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${URL}#collection`,
      url: URL,
      name: TITLE,
      description: DESCRIPTION,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: authors.length,
        itemListElement: authors.slice(0, 50).map((a, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "Person",
            "@id": `${SITE_URL}/author/${a.slug}#person`,
            name: a.display_name,
            url: `${SITE_URL}/author/${a.slug}`,
            ...(a.avatar_url ? { image: a.avatar_url } : {}),
            ...(a.job_title ? { jobTitle: a.job_title } : {}),
          },
        })),
      },
    };
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESCRIPTION },
        { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
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
        { name: "twitter:image", content: DEFAULT_OG_IMAGE },
      ],
      links: [{ rel: "canonical", href: URL }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(collection) }],
    };
  },
  component: Page,
});

function Page() {
  const authors = Route.useLoaderData();
  return <AuthorsIndex authors={authors} />;
}
