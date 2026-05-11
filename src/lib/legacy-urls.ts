/**
 * Rewrites legacy absolute WordPress URLs to relative paths so they hit the
 * app-level proxy (/wp-content/uploads/* → sareld.wpengine.com).
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

// Rewrite the raw Supabase project host to the custom API domain so the
// project ref isn't leaked in image/asset URLs in the browser.
const SUPABASE_HOST_PATTERN = /https?:\/\/unycfscvsckgxboherpk\.supabase\.co/gi;
const SUPABASE_API_HOST = "https://api.everything-pr.com";

export function rewriteSupabaseHost(url: string | null | undefined): string {
  if (!url) return "";
  return url.replace(SUPABASE_HOST_PATTERN, SUPABASE_API_HOST);
}

const HOST_PATTERN = /(https?:\/\/(?:www\.)?everything-pr\.com)(\/wp-content\/)/gi;
const LEGACY_ATTR_PATTERN = /(src|href)=(['"])https:\/\/everything-pr\.com(\/wp-content\/[^'"]+)\2/gi;

/** Rewrite a single URL string. Leaves non-matching URLs untouched. */
export function rewriteLegacyUrl(url: string | null | undefined): string {
  if (!url) return "";
  let next = url;
  for (const host of LEGACY_HOSTS) {
    if (next.startsWith(`${host}/wp-content/`)) {
      next = next.slice(host.length);
      break;
    }
  }
  return rewriteSupabaseHost(next);
}

/** Rewrite all legacy /wp-content/ URLs inside an HTML blob (src, href, srcset). */
export function rewriteWpContentUrls(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(LEGACY_ATTR_PATTERN, "$1=$2$3$2")
    .replace(HOST_PATTERN, "$2")
    .replace(SUPABASE_HOST_PATTERN, SUPABASE_API_HOST);
}

/**
 * Convert legacy everything-pr.com anchors into internal relative paths and
 * mark cross-domain anchors to open in a new tab with safe rel attributes.
 */
function normalizeAnchorTargets(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (full, attrsRaw: string) => {
    let attrs = attrsRaw;
    const hrefMatch = attrs.match(/\shref=(["'])([^"']+)\1/i);
    if (!hrefMatch) return full;
    let href = hrefMatch[2];

    // Rewrite legacy everything-pr.com links to internal relative paths
    for (const host of LEGACY_HOSTS) {
      if (href === host || href === `${host}/` || href.startsWith(`${host}/`)) {
        const path = href.slice(host.length) || "/";
        if (!path.startsWith("/wp-content/")) {
          href = path;
          attrs = attrs.replace(/\shref=(["'])[^"']+\1/i, ` href="${href}"`);
        }
        break;
      }
    }

    const isInternal =
      href.startsWith("/") ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:");

    if (isInternal) {
      attrs = attrs.replace(/\starget=(["'])[^"']*\1/gi, "");
      return `<a${attrs}>`;
    }

    if (/\starget=/i.test(attrs)) {
      attrs = attrs.replace(/\starget=(["'])[^"']*\1/i, ' target="_blank"');
    } else {
      attrs += ' target="_blank"';
    }
    if (/\srel=/i.test(attrs)) {
      attrs = attrs.replace(/\srel=(["'])([^"']*)\1/i, (_m, q, val) => {
        const parts = new Set(String(val).split(/\s+/).filter(Boolean));
        parts.add("noopener");
        parts.add("noreferrer");
        return ` rel=${q}${Array.from(parts).join(" ")}${q}`;
      });
    } else {
      attrs += ' rel="noopener noreferrer"';
    }
    return `<a${attrs}>`;
  });
}

/** Add loading="lazy" + decoding="async" to inline <img> tags that don't already specify them. */
function addImgPerfHints(html: string): string {
  return html.replace(/<img\b([^>]*)>/gi, (full, attrs: string) => {
    let next = attrs;
    if (!/\bloading=/i.test(next)) next += ' loading="lazy"';
    if (!/\bdecoding=/i.test(next)) next += ' decoding="async"';
    return `<img${next}>`;
  });
}

export function rewriteLegacyHtml(html: string | null | undefined): string {
  return addImgPerfHints(normalizeAnchorTargets(rewriteWpContentUrls(html)));
}

export function pickFirstImageSrc(html: string | null | undefined): string | null {
  if (!html) return null;
  const rewritten = rewriteWpContentUrls(html);
  const match = rewritten.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ? rewriteLegacyUrl(match[1]) : null;
}

/**
 * Strip the first <img> (and a wrapping <figure>/<p> if it contains only that img)
 * from an HTML blob. Used to avoid duplicating the article's featured image
 * when it was derived from the first inline image.
 */
export function stripFirstImage(html: string | null | undefined): string {
  if (!html) return "";
  // Try to strip a <figure>...<img>...</figure> wrapper first
  const figureRe = /<figure\b[^>]*>\s*(?:<a\b[^>]*>\s*)?<img\b[^>]*>(?:\s*<\/a>)?\s*(?:<figcaption\b[^>]*>[\s\S]*?<\/figcaption>\s*)?<\/figure>/i;
  if (figureRe.test(html)) return html.replace(figureRe, "");
  // <p> wrapping just an image
  const pRe = /<p\b[^>]*>\s*(?:<a\b[^>]*>\s*)?<img\b[^>]*>(?:\s*<\/a>)?\s*<\/p>/i;
  if (pRe.test(html)) return html.replace(pRe, "");
  // Bare <img>
  return html.replace(/<img\b[^>]*\/?>/i, "");
}

export function resolvePostImageUrl(...candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    const rewritten = rewriteLegacyUrl(candidate ?? "");
    if (rewritten) return rewritten;
  }
  return null;
}
