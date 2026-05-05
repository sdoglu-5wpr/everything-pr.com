/**
 * Rewrites legacy absolute WordPress URLs to relative paths so they hit the
 * vercel.json proxy (/wp-content/uploads/* → sareld.wpengine.com).
 *
 * Applied at RENDER time only — never mutate posts.content_html in the DB.
 * Used by: <ArticleBody>, RSS <content:encoded>, JSON-LD articleBody,
 * og:description excerpts, featured-image URL resolution.
 */
const LEGACY_HOSTS = [
  "https://everything-pr.com",
  "http://everything-pr.com",
  "https://www.everything-pr.com",
  "http://www.everything-pr.com",
];

const HOST_PATTERN = /(https?:\/\/(?:www\.)?everything-pr\.com)(\/wp-content\/)/gi;

/** Rewrite a single URL string. Leaves non-matching URLs untouched. */
export function rewriteLegacyUrl(url: string | null | undefined): string {
  if (!url) return "";
  for (const host of LEGACY_HOSTS) {
    if (url.startsWith(`${host}/wp-content/`)) {
      return url.slice(host.length);
    }
  }
  return url;
}

/** Rewrite all legacy /wp-content/ URLs inside an HTML blob (src, href, srcset). */
export function rewriteLegacyHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(HOST_PATTERN, "$2");
}
