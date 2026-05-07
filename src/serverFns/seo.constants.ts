// Shared SEO constants for sitemaps, feeds, and per-page <head> generation.
export const SITE_URL = "https://everything-pr.com";
export const SITE_NAME = "Everything-PR";
export const SITE_TAGLINE = "Public Relations News & Analysis";
export const TWITTER_HANDLE = "@everythingpr";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;
export const SITE_LOGO = `${SITE_URL}/logo.png`;
export const SITEMAP_PAGE_SIZE = 1000;

export const ORG_SAME_AS = [
  "https://www.linkedin.com/company/everything-pr",
  "https://twitter.com/everythingpr",
  "https://www.facebook.com/everythingpr",
  "https://www.youtube.com/@everythingpr",
];

/**
 * Full NewsMediaOrganization graph node, modeled after the legacy Yoast
 * output. Used as the sitewide #organization node referenced from every
 * page's @graph.
 */
export const ORG_JSONLD = {
  "@type": "NewsMediaOrganization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  alternateName: "Everything PR News",
  url: `${SITE_URL}/`,
  logo: {
    "@type": "ImageObject",
    "@id": `${SITE_URL}/#/schema/logo`,
    inLanguage: "en-US",
    url: SITE_LOGO,
    contentUrl: SITE_LOGO,
    width: 600,
    height: 60,
    caption: SITE_NAME,
  },
  image: { "@id": `${SITE_URL}/#/schema/logo` },
  description:
    "Everything-PR is a leading public relations news publication covering PR agencies, campaigns, crisis communications, and the global PR industry since 2009.",
  foundingDate: "2009",
  sameAs: ORG_SAME_AS,
  publishingPrinciples: `${SITE_URL}/editorial-policy/`,
  ethicsPolicy: `${SITE_URL}/ethics-policy/`,
  diversityPolicy: `${SITE_URL}/diversity-policy/`,
  correctionsPolicy: `${SITE_URL}/corrections-policy/`,
  actionableFeedbackPolicy: `${SITE_URL}/contact/`,
  masthead: `${SITE_URL}/about/`,
};
