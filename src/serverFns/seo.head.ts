import { SITE_URL, SITE_NAME, TWITTER_HANDLE, DEFAULT_OG_IMAGE, ORG_JSONLD } from "./seo.constants";
import { rewriteLegacyUrl } from "@/lib/legacy-urls";

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

function baseMeta(title: string, description: string, url: string, image: string | null, ogType: "website" | "article" | "profile"): Meta {
  const m: Meta = [
    { title },
    { name: "description", content: description },
    { property: "og:locale", content: "en_US" },
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
    m.push({ property: "og:image:width", content: "1200" });
    m.push({ property: "og:image:height", content: "630" });
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

/**
 * Generic head builder for static informational pages (about, contact,
 * research landing, etc.). Emits Organization + WebSite + WebPage JSON-LD
 * plus full OG / Twitter meta and a canonical link.
 */
export function buildStaticPageHead(opts: {
  path: string;
  title: string;
  description: string;
  image?: string | null;
  breadcrumbs?: Array<{ name: string; item?: string }>;
}): HeadOutput {
  const url = `${SITE_URL}${opts.path.startsWith("/") ? "" : "/"}${opts.path}`;
  const description = truncate(opts.description);
  const image = opts.image || DEFAULT_OG_IMAGE;
  const meta = baseMeta(opts.title, description, url, image, "website");
  const links: Link = [{ rel: "canonical", href: url }];
  const webPage = {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: opts.title,
    description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en-US",
  };
  const graph: unknown[] = [ORG_JSONLD, websiteNode, webPage];
  if (opts.breadcrumbs && opts.breadcrumbs.length > 0) {
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        ...opts.breadcrumbs.map((b, i) => ({
          "@type": "ListItem",
          position: i + 2,
          name: b.name,
          ...(b.item ? { item: b.item } : {}),
        })),
      ],
    });
  }
  return { meta, links, scripts: [jsonLd(...graph)] };
}

type ArchiveKind = "category" | "tag" | "author" | "search";

type AuthorMeta = {
  display_name: string;
  slug: string;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  social: { twitter?: string | null; linkedin?: string | null; facebook?: string | null; instagram?: string | null } | null;
} | undefined;

export function buildArchiveHead(opts: {
  kind: ArchiveKind;
  termTitle: string;
  termDescription?: string | null;
  page: number;
  totalItems: number;
  items: Array<{ title: string; slug: string }>;
  pathPrefix: string; // e.g. "/category/news-slug"
  searchPhrase?: string;
  author?: AuthorMeta;
  seoOverrides?: {
    title?: string | null;
    description?: string | null;
    canonical_url?: string | null;
    robots?: string | null;
    og_image?: string | null;
  };
  emitCanonical?: boolean;
}): HeadOutput {
  const { kind, termTitle, termDescription, page, totalItems, items, pathPrefix, searchPhrase, author, seoOverrides, emitCanonical = true } = opts;

  let titleTemplate: string;
  let descTemplate: string;
  let breadcrumbLabel: string;
  switch (kind) {
    case "category":
      titleTemplate = `${termTitle} | ${SITE_NAME}`;
      descTemplate = termDescription || `Latest ${termTitle} articles, news, and analysis from ${SITE_NAME}.`;
      breadcrumbLabel = "Categories";
      break;
    case "tag":
      titleTemplate = `${termTitle} | ${SITE_NAME}`;
      descTemplate = termDescription || `Latest ${termTitle} articles, news, and analysis from ${SITE_NAME}.`;
      breadcrumbLabel = "Tags";
      break;
    case "author":
      titleTemplate = `${termTitle} - ${SITE_NAME}`;
      descTemplate = termDescription || `Articles by ${termTitle} on ${SITE_NAME}.`;
      breadcrumbLabel = "Contributors";
      break;
    case "search":
      titleTemplate = `You searched for ${searchPhrase ?? termTitle} | ${SITE_NAME}`;
      descTemplate = `${totalItems} result${totalItems === 1 ? "" : "s"} for "${searchPhrase ?? termTitle}" on ${SITE_NAME}.`;
      breadcrumbLabel = "Search";
      break;
  }
  const baseTitle = seoOverrides?.title || titleTemplate;
  const title = page > 1 ? `${baseTitle} — Page ${page}` : baseTitle;
  const description = truncate(seoOverrides?.description || descTemplate);
  // Canonical / og:url ALWAYS points to page 1 of the archive. Pagination pages
  // get noindex,follow so Google doesn't index thin paginated variants but
  // still crawls the article links on them.
  const baseUrl = `${SITE_URL}${pathPrefix}`;
  const url = baseUrl;
  const ogType = kind === "author" ? "article" : "website";
  const ogImage = rewriteLegacyUrl(seoOverrides?.og_image
    || (kind === "author" && author?.avatar_url ? author.avatar_url : DEFAULT_OG_IMAGE)) || DEFAULT_OG_IMAGE;
  const meta = baseMeta(title, description, url, ogImage, ogType);
  // Robots:
  //  - Page 2+ of any archive: noindex, follow (Google's recommended pagination signal)
  //  - Tag archives: always noindex, follow (heavy duplication with categories/search)
  //  - seoOverrides.robots wins if explicitly set
  const robotsValue =
    seoOverrides?.robots
    || (page > 1 ? "noindex, follow, max-image-preview:large" : null)
    || (kind === "tag" ? "noindex, follow" : null);
  if (robotsValue) meta.push({ name: "robots", content: robotsValue });
  const canonicalHref = seoOverrides?.canonical_url || url;
  const links: Link = emitCanonical ? [{ rel: "canonical", href: canonicalHref }] : [];

  const itemList = {
    "@type": "ItemList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: (page - 1) * 10 + i + 1,
      url: `${SITE_URL}/${it.slug}`,
      name: it.title,
    })),
  };

  const breadcrumbId = `${url}#breadcrumb`;
  const breadcrumbNode = {
    "@type": "BreadcrumbList",
    "@id": breadcrumbId,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: breadcrumbLabel },
      { "@type": "ListItem", position: 3, name: termTitle, item: `${SITE_URL}${pathPrefix}` },
    ],
  };

  // Author archive → ProfilePage + Person; otherwise CollectionPage
  if (kind === "author" && author) {
    const personId = `${SITE_URL}/author/${author.slug}#person`;
    const sameAs = [author.social?.linkedin, author.social?.twitter, author.social?.facebook, author.social?.instagram, author.website]
      .filter((u): u is string => Boolean(u));
    const personNode: Record<string, unknown> = {
      "@type": "Person",
      "@id": personId,
      name: author.display_name,
      url: `${SITE_URL}${pathPrefix}`,
      description: author.bio ? author.bio.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500) : undefined,
      image: author.avatar_url
        ? { "@type": "ImageObject", url: author.avatar_url, contentUrl: author.avatar_url, caption: author.display_name }
        : undefined,
      jobTitle: "Contributor at Everything-PR",
      worksFor: { "@id": `${SITE_URL}/#organization` },
      mainEntityOfPage: { "@id": `${url}#webpage` },
    };
    if (sameAs.length) personNode.sameAs = sameAs;

    const profilePage = {
      "@type": "ProfilePage",
      "@id": `${url}#webpage`,
      url,
      name: title,
      description,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      breadcrumb: { "@id": breadcrumbId },
      mainEntity: { "@id": personId },
      hasPart: itemList,
      inLanguage: "en-US",
    };

    return {
      meta,
      links,
      scripts: [jsonLd(ORG_JSONLD, websiteNode, profilePage, personNode, breadcrumbNode)],
    };
  }

  const collectionPage = {
    "@type": "CollectionPage",
    "@id": `${url}#webpage`,
    url,
    name: title,
    description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
    breadcrumb: { "@id": breadcrumbId },
    mainEntity: itemList,
    inLanguage: "en-US",
  };

  return { meta, links, scripts: [jsonLd(ORG_JSONLD, websiteNode, collectionPage, breadcrumbNode)] };
}
