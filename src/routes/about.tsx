import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { SiteLayout } from "@/components/site/SiteLayout";
import { AboutPage } from "@/components/site/AboutPage";
import { isPreviewHost } from "@/serverFns/seo.head";
import { SITE_URL, SITE_NAME, ORG_JSONLD, DEFAULT_OG_IMAGE, TWITTER_HANDLE } from "@/serverFns/seo.constants";

const getHost = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return getRequestHost({ xForwardedHost: true }) ?? null;
  } catch {
    return null;
  }
});

const TITLE = "About Everything-PR";
const DESCRIPTION =
  "Everything-PR is the independent intelligence platform covering communications — 20 sectors, 14 disciplines, proprietary research, and 17 years of continuous daily publishing.";
const URL = `${SITE_URL}/about`;

export const Route = createFileRoute("/about")({
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
    const aboutPage = {
      "@type": "AboutPage",
      "@id": `${URL}#aboutpage`,
      url: URL,
      name: TITLE,
      description: DESCRIPTION,
      isPartOf: { "@id": `${SITE_URL}/#organization` },
      mainEntity: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-US",
    };
    const ronn = {
      "@type": "Person",
      "@id": `${SITE_URL}/author/ronn-torossian#person`,
      name: "Ronn Torossian",
      jobTitle: "Publisher, Everything-PR News Network",
      worksFor: [
        { "@id": `${SITE_URL}/#organization` },
        { "@type": "Organization", name: "5W Public Relations" },
      ],
      url: `${SITE_URL}/author/ronn-torossian/`,
    };
    const seth = {
      "@type": "Person",
      "@id": `${SITE_URL}/author/seth-semilof#person`,
      name: "Seth Semilof",
      jobTitle: "Co-Founder and COO, Haute Media Group",
      url: `${SITE_URL}/author/seth-semilof/`,
    };
    const michael = {
      "@type": "Person",
      "@id": `${SITE_URL}/author/michael-heller#person`,
      name: "Michael Heller",
      jobTitle: "Founder and CEO, Talent Resources",
      url: `${SITE_URL}/author/michael-heller/`,
    };
    const kevin = {
      "@type": "Person",
      "@id": `${SITE_URL}/author/kevin-mercuri#person`,
      name: "Kevin Mercuri",
      jobTitle: "Founder and CEO, Propheta Communications; Executive-in-Residence, Emerson College",
      url: `${SITE_URL}/author/kevin-mercuri/`,
    };
    const orgWithPublisher = { ...ORG_JSONLD, publisher: { "@id": `${SITE_URL}/author/ronn-torossian#person` } };
    const breadcrumb = {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "About" },
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
            "@graph": [aboutPage, orgWithPublisher, ronn, seth, michael, kevin, breadcrumb],
          }),
        },
      ],
    };
  },
  component: () => (
    <SiteLayout>
      <AboutPage />
    </SiteLayout>
  ),
});
