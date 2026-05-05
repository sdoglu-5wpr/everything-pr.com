// Shared SEO constants for sitemaps, feeds, and per-page <head> generation.
export const SITE_URL = "https://everything-pr.com";
export const SITE_NAME = "Everything-PR";
export const SITE_TAGLINE = "Public Relations News & Analysis";
export const TWITTER_HANDLE = "@everythingpr";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;
export const SITEMAP_PAGE_SIZE = 1000;
export const ORG_JSONLD = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    "@id": `${SITE_URL}/#logo`,
    url: DEFAULT_OG_IMAGE,
    contentUrl: DEFAULT_OG_IMAGE,
    caption: SITE_NAME,
  },
};
