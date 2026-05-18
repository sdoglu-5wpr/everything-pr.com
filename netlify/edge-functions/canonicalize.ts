// Netlify Edge Function: canonicalize URLs at the edge.
//
// Runs BEFORE static asset serving and SSR. Strips tracking / AMP query
// params and issues a single 301 to an ABSOLUTE clean URL so Netlify can't
// re-attach the original query string (which was causing infinite loops
// with `[[redirects]]` query rules).

import type { Context } from "https://edge.netlify.com";

const APEX_HOST = "everything-pr.com";

const STRIP_QUERY_PARAMS = new Set([
  "noamp", "amp",
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
  "gclid", "gclsrc", "dclid", "fbclid", "msclkid", "yclid",
  "_ga", "mc_cid", "mc_eid", "ck_subscriber_id",
  "ref", "referrer", "trk", "trkInfo",
  "__hstc", "__hssc", "hsCtaTracking",
  "si", "feature", "share",
]);

const WP_BLOCK = [
  /^\/wp-admin(\/|$)/i,
  /^\/wp-login\.php/i,
  /^\/xmlrpc\.php/i,
  /^\/wp-json(\/|$)/i,
  /^\/wp-content\/plugins(\/|$)/i,
  /^\/wp-content\/themes(\/|$)/i,
];

export default async (request: Request, _context: Context) => {
  const url = new URL(request.url);

  // Bypass for dynamic / server-handled paths. We MUST NOT rewrite or 301
  // these — a 301 on a POST downgrades it to GET on the retry, which breaks
  // every server function call (TanStack throws "expected POST. Got GET").
  // Match case-insensitively because Netlify's excludedPath has historically
  // been unreliable here.
  const lowerPath = url.pathname.toLowerCase();
  if (
    lowerPath.startsWith("/_serverfn") ||
    lowerPath.startsWith("/_server/") ||
    lowerPath.startsWith("/ln/") ||
    lowerPath === "/ln" ||
    lowerPath.startsWith("/api/") ||
    lowerPath.startsWith("/admin-everything") ||
    lowerPath.startsWith("/admin/") ||
    lowerPath.startsWith("/.netlify/")
  ) {
    return;
  }

  let changed = false;

  // www. -> apex
  if (url.hostname.toLowerCase() === `www.${APEX_HOST}`) {
    url.hostname = APEX_HOST;
    changed = true;
  }

  // Block legacy WP admin paths
  for (const rx of WP_BLOCK) {
    if (rx.test(url.pathname)) {
      return new Response("Gone", {
        status: 410,
        headers: { "Cache-Control": "public, max-age=86400" },
      });
    }
  }

  // Lowercase pathname
  if (!url.pathname.startsWith("/_serverFn") && /[A-Z]/.test(url.pathname)) {
    url.pathname = url.pathname.toLowerCase();
    changed = true;
  }

  // Collapse double slashes
  if (/\/{2,}/.test(url.pathname)) {
    url.pathname = url.pathname.replace(/\/{2,}/g, "/");
    changed = true;
  }

  // Strip BOM / zero-width / invisible characters from the path. Legacy
  // WordPress imports left BOM (U+FEFF) and zero-width chars in slugs;
  // Google has thousands of those URLs queued and they redirect to broken
  // percent-encoded variants. Drop them with a 301 to the clean slug.
  if (/[\u200b-\u200f\u2028-\u202f\u2060\ufeff]/.test(url.pathname) ||
      /%e2%80[89ab][0-9a-f]/i.test(url.pathname) ||
      /%ef%bb%bf/i.test(url.pathname)) {
    url.pathname = url.pathname
      .replace(/[\u200b-\u200f\u2028-\u202f\u2060\ufeff]/g, "")
      .replace(/%e2%80[89ab][0-9a-f]/gi, "")
      .replace(/%ef%bb%bf/gi, "");
    changed = true;
  }

  // Legacy WordPress numeric-ID URLs: /{slug}/{digits}/ or /{slug}/{digits}
  // are old WP post-id permalink variants that duplicate the canonical
  // /{slug}/ form. Google reports them as "Crawled - currently not indexed"
  // duplicates. 301 strip the trailing /digits segment.
  const wpIdMatch = url.pathname.match(/^\/([^\/]+)\/(\d+)(\/?)$/);
  if (wpIdMatch && !["author", "category", "tag", "page", "post", "glossary", "api", "admin", "admin-everything"].includes(wpIdMatch[1])) {
    url.pathname = `/${wpIdMatch[1]}${wpIdMatch[3]}`;
    changed = true;
  }

  // Trailing-slash policy: DO NOT strip trailing slashes at the edge.
  // Netlify serves prerendered HTML from directories (e.g.
  // dist/client/about/index.html) and 301s the no-slash form to the slash
  // form. If we strip slashes here we create an infinite redirect loop
  // (/about → /about/ → /about → …) which broke EVERY prerendered page,
  // including all blog posts. Let Netlify's pretty-URL behavior win.
  // Dynamic SSR-only routes (e.g. /cannabis) serve at both /cannabis and
  // /cannabis/ — rel=canonical in <head> tells Google which to index.

  // Strip tracking / AMP query params
  if (url.search) {
    const toDelete: string[] = [];
    for (const k of url.searchParams.keys()) {
      if (STRIP_QUERY_PARAMS.has(k.toLowerCase())) toDelete.push(k);
    }
    if (toDelete.length > 0) {
      for (const k of toDelete) url.searchParams.delete(k);
      changed = true;
    }
  }

  if (changed) {
    // Absolute URL prevents Netlify from re-attaching the original query string.
    const absolute = `${url.protocol}//${url.hostname}${url.pathname}${url.search}${url.hash}`;
    return new Response(null, {
      status: 301,
      headers: {
        Location: absolute,
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  }

  // No change — let the request continue to the next handler.
  return;
};

export const config = {
  path: "/*",
  // Skip assets and internal endpoints to avoid unnecessary edge invocations.
  excludedPath: [
    "/assets/*",
    "/wp-content/uploads/*",
    "/_serverFn/*",
    "/ln/*",
    "/api/*",
    "/admin-everything/*",
    "/.netlify/*",
    "/*.js",
    "/*.css",
    "/*.png",
    "/*.jpg",
    "/*.jpeg",
    "/*.webp",
    "/*.avif",
    "/*.svg",
    "/*.ico",
    "/*.woff",
    "/*.woff2",
    "/*.map",
  ],
};
