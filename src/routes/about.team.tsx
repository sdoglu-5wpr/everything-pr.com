import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { SiteLayout } from "@/components/site/SiteLayout";
import { AboutTeamPage } from "@/components/site/AboutTeamPage";
import { isPreviewHost } from "@/serverFns/seo.head";
import { SITE_URL, SITE_NAME, ORG_JSONLD, DEFAULT_OG_IMAGE, TWITTER_HANDLE } from "@/serverFns/seo.constants";

const getHost = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return getRequestHost({ xForwardedHost: true }) ?? null;
  } catch {
    return null;
  }
});

const TITLE = "Team — Everything-PR";
const DESCRIPTION = "The named editorial team and contributing editors behind Everything-PR.";
const URL = `${SITE_URL}/about/team`;

const PEOPLE = [
  {
    id: `${URL}#ronn-torossian`,
    name: "Ronn Torossian",
    jobTitle: "Publisher & Editor-in-Chief, Everything-PR",
    worksFor: "5W",
    url: `${SITE_URL}/author/ronn-torossian`,
  },
  {
    id: `${URL}#seth-semilof`,
    name: "Seth Semilof",
    jobTitle: "Contributing Editor",
    worksFor: "Haute Media Group",
  },
  {
    id: `${URL}#michael-heller`,
    name: "Michael Heller",
    jobTitle: "Contributing Editor",
    worksFor: "Talent Resources",
  },
  {
    id: `${URL}#kevin-mercuri`,
    name: "Kevin Mercuri",
    jobTitle: "Contributing Editor",
    worksFor: "Propheta Communications",
  },
  {
    id: `${URL}#kyle-porter`,
    name: "Kyle Porter",
    jobTitle: "Contributing Editor",
    worksFor: "Virgo PR",
  },
];

export const Route = createFileRoute("/about/team")({
  loader: async () => ({ host: await getHost() }),
  head: ({ loaderData }) => {
    const preview = isPreviewHost(loaderData?.host);
    const robots = preview
      ? "noindex, follow, max-image-preview:large"
      : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
    const meta = [
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
      { name: "twitter:image", content: DEFAULT_OG_IMAGE },
    ];
    const collectionPage = {
      "@type": "CollectionPage",
      "@id": `${URL}#page`,
      url: URL,
      name: TITLE,
      description: DESCRIPTION,
      isPartOf: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-US",
    };
    const persons = PEOPLE.map((p) => ({
      "@type": "Person",
      "@id": p.id,
      name: p.name,
      jobTitle: p.jobTitle,
      worksFor: { "@type": "Organization", name: p.worksFor },
      ...(p.url ? { url: p.url } : {}),
      sameAs: [],
    }));
    const breadcrumb = {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "About", item: `${SITE_URL}/about` },
        { "@type": "ListItem", position: 3, name: "Team" },
      ],
    };
    return {
      meta,
      links: [{ rel: "canonical", href: URL }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [collectionPage, ...persons, ORG_JSONLD, breadcrumb],
          }),
        },
      ],
    };
  },
  component: () => (
    <SiteLayout>
      <AboutTeamPage />
    </SiteLayout>
  ),
});
