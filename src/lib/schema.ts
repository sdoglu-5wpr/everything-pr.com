/**
 * Canonical schema.org JSON-LD builders for everything-pr.com.
 * Mirrors the spec at _lovable-migration/SCHEMA-JSON-LD-SPEC.md.
 *
 * Every page emits ONE <script type="application/ld+json"> block whose
 * payload is { "@context": "https://schema.org", "@graph": [...] }.
 * Helpers below produce individual nodes; route head() composes them.
 */
import {
  SITE_URL,
  SITE_NAME,
  ORG_JSONLD,
  DEFAULT_OG_IMAGE,
} from "@/serverFns/seo.constants";

export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const LOGO_ID = `${SITE_URL}/#/schema/logo`;

export function organizationNode() {
  return ORG_JSONLD;
}

export function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    description: "Public relations news, agency rankings, and industry analysis",
    publisher: { "@id": ORG_ID },
    potentialAction: [
      {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/search?s={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    ],
    inLanguage: "en-US",
  };
}

export function imageObjectNode(opts: {
  url: string;
  pageUrl: string;
  caption?: string;
  width?: number;
  height?: number;
}) {
  return {
    "@type": "ImageObject",
    "@id": `${opts.pageUrl}#primaryimage`,
    inLanguage: "en-US",
    url: opts.url,
    contentUrl: opts.url,
    width: opts.width ?? 1200,
    height: opts.height ?? 630,
    caption: opts.caption || "",
  };
}

export type Crumb = { name: string; item?: string };

export function breadcrumbNode(pageUrl: string, crumbs: Crumb[]) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      ...crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: c.name,
        ...(c.item ? { item: c.item } : {}),
      })),
    ],
  };
}

export function personNode(author: {
  slug?: string | null;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  website?: string | null;
  social?: { twitter?: string | null; linkedin?: string | null; facebook?: string | null; instagram?: string | null } | null;
  jobTitle?: string;
}) {
  const id = author.slug
    ? `${SITE_URL}/author/${author.slug}/#person`
    : `${SITE_URL}/#/schema/person/editorial`;
  const sameAs = [author.social?.linkedin, author.social?.twitter, author.social?.facebook, author.social?.instagram, author.website]
    .filter((u): u is string => Boolean(u));
  const node: Record<string, unknown> = {
    "@type": "Person",
    "@id": id,
    name: author.display_name,
    url: author.slug ? `${SITE_URL}/author/${author.slug}/` : `${SITE_URL}/`,
    jobTitle: author.jobTitle || "Contributor at Everything-PR",
    worksFor: { "@id": ORG_ID },
    knowsAbout: ["Public Relations", "Crisis Communications", "Media Relations"],
  };
  if (author.avatar_url) {
    node.image = {
      "@type": "ImageObject",
      inLanguage: "en-US",
      url: author.avatar_url,
      contentUrl: author.avatar_url,
      caption: author.display_name,
    };
  }
  if (author.bio) {
    node.description = author.bio.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
  }
  if (sameAs.length) node.sameAs = sameAs;
  return node;
}

export function faqPageNode(pairs: Array<{ q: string; a: string }>, pageUrl: string) {
  if (!pairs || pairs.length < 2) return null;
  return {
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    mainEntity: pairs.map((p) => ({
      "@type": "Question",
      name: p.q,
      acceptedAnswer: { "@type": "Answer", text: p.a },
    })),
  };
}

export function buildGraph(...nodes: unknown[]) {
  return { "@context": "https://schema.org", "@graph": nodes.filter(Boolean) };
}

export const SCHEMA = {
  ORG_ID,
  WEBSITE_ID,
  LOGO_ID,
  DEFAULT_OG_IMAGE,
  SITE_URL,
  SITE_NAME,
};
