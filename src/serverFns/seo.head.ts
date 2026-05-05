import { SITE_URL, SITE_NAME, TWITTER_HANDLE, DEFAULT_OG_IMAGE, ORG_JSONLD } from "./seo.constants";

type Meta = Array<Record<string, string>>;
type Link = Array<Record<string, string>>;
type ScriptTag = { type?: string; children?: string };

export type HeadOutput = { meta: Meta; links: Link; scripts: ScriptTag[] };

function truncate(s: string, n = 160): string {
  if (!s) return s;
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= n) return clean;
  return clean.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
}

function jsonLd(...graph: unknown[]): ScriptTag {
  return { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }) };
}

const websiteNode = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: SITE_NAME,
  publisher: { "@id": `${SITE_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?s={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

function baseMeta(title: string, description: string, url: string, image: string | null, ogType: "website" | "article"): Meta {
  const m: Meta = [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: ogType },
    { property: "og:url", content: url },
    { property: "og:site_name", content: SITE_NAME },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: TWITTER_HANDLE },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
  if (image) {
    m.push({ property: "og:image", content: image });
    m.push({ name: "twitter:image", content: image });
  }
  return m;
}

export function buildHomepageHead(opts: { title?: string; description?: string }): HeadOutput {
  const title = opts.title || `${SITE_NAME} — Public Relations News & Analysis`;
  const description = truncate(
    opts.description ||
      "Daily reporting on the public relations industry — agencies, campaigns, crisis, brands, and the people behind the work.",
  );
  const url = `${SITE_URL}/`;
  const meta = baseMeta(title, description, url, DEFAULT_OG_IMAGE, "website");
  const links: Link = [{ rel: "canonical", href: url }];
  const webPage = {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: title,
    description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
  };
  return { meta, links, scripts: [jsonLd(ORG_JSONLD, websiteNode, webPage)] };
}

type ArchiveKind = "category" | "tag" | "author" | "search";

export function buildArchiveHead(opts: {
  kind: ArchiveKind;
  termTitle: string;
  termDescription?: string | null;
  page: number;
  totalItems: number;
  items: Array<{ title: string; slug: string }>;
  pathPrefix: string; // e.g. "/category/news-slug"
  searchPhrase?: string;
}): HeadOutput {
  const { kind, termTitle, termDescription, page, totalItems, items, pathPrefix, searchPhrase } = opts;

  let titleTemplate: string;
  let descTemplate: string;
  switch (kind) {
    case "category":
    case "tag":
      titleTemplate = `${termTitle} | ${SITE_NAME}`;
      descTemplate = termDescription || `Latest ${termTitle} articles, news, and analysis from ${SITE_NAME}.`;
      break;
    case "author":
      titleTemplate = `${termTitle} - ${SITE_NAME}`;
      descTemplate = termDescription || `Articles by ${termTitle} on ${SITE_NAME}.`;
      break;
    case "search":
      titleTemplate = `You searched for ${searchPhrase ?? termTitle} | ${SITE_NAME}`;
      descTemplate = `${totalItems} result${totalItems === 1 ? "" : "s"} for "${searchPhrase ?? termTitle}" on ${SITE_NAME}.`;
      break;
  }
  const title = page > 1 ? `${titleTemplate} — Page ${page}` : titleTemplate;
  const description = truncate(descTemplate);
  const url = page > 1 ? `${SITE_URL}${pathPrefix}/page/${page}/` : `${SITE_URL}${pathPrefix}/`;
  const meta = baseMeta(title, description, url, DEFAULT_OG_IMAGE, "website");
  const links: Link = [{ rel: "canonical", href: url }];

  const itemList = {
    "@type": "ItemList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: (page - 1) * 10 + i + 1,
      url: `${SITE_URL}/${it.slug}/`,
      name: it.title,
    })),
  };
  const collectionPage = {
    "@type": "CollectionPage",
    "@id": `${url}#webpage`,
    url,
    name: title,
    description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
    mainEntity: itemList,
  };

  return { meta, links, scripts: [jsonLd(ORG_JSONLD, websiteNode, collectionPage)] };
}
