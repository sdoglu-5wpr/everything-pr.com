import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import redirectsData from "./generated/redirects.json";

const tanstackFetch = createStartHandler(defaultStreamHandler);

type Redirect = { source: string; target: string; status: number };
const REDIRECT_MAP = new Map<string, Redirect>(
  (redirectsData as Redirect[]).map((r) => [r.source.replace(/\/$/, "") || "/", r]),
);

const NOINDEX_HEADER = "noindex, nofollow, noarchive, nosnippet, noimageindex";

// ----- Canonicalization (SEO) ---------------------------------------------
// Strip these query params on every request. Permanent (301) so Google
// consolidates the variant into the canonical URL.
const STRIP_QUERY_PARAMS = new Set([
  "noamp", "amp",
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
  "gclid", "gclsrc", "dclid", "fbclid", "msclkid", "yclid",
  "_ga", "mc_cid", "mc_eid", "ck_subscriber_id",
  "ref", "referrer", "trk", "trkInfo",
  "__hstc", "__hssc", "hsCtaTracking",
  "si", "feature", "share",
]);

// Legacy WordPress paths — return 410 Gone so Google drops them from the index.
// /wp-content/uploads/ stays accessible (image proxy).
const WP_BLOCK = [
  /^\/wp-admin(\/|$)/i,
  /^\/wp-login\.php/i,
  /^\/xmlrpc\.php/i,
  /^\/wp-json(\/|$)/i,
  /^\/wp-content\/plugins(\/|$)/i,
  /^\/wp-content\/themes(\/|$)/i,
];

const APEX_HOST = "everything-pr.com";

function permanentRedirect(location: string): Response {
  return new Response(null, {
    status: 301,
    headers: {
      Location: location,
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

function shouldEnforceTrailingSlash(path: string): boolean {
  if (path === "/") return false;
  if (path.startsWith("/api/")) return false;
  if (path.startsWith("/_serverFn") || path.startsWith("/_server")) return false;
  if (path.startsWith("/admin")) return false;
  if (path.startsWith("/wp-content/uploads/")) return false;
  // Anything that looks like a file (has a dot in the last segment): skip
  const last = path.split("/").pop() ?? "";
  if (last.includes(".")) return false;
  return true;
}

function canonicalize(request: Request): Response | null {
  const url = new URL(request.url);
  let changed = false;

  // 1. Host: www. → apex (and protocol stays whatever upstream gave us; CF "Always HTTPS" handles http→https)
  if (url.hostname.toLowerCase() === `www.${APEX_HOST}`) {
    url.hostname = APEX_HOST;
    changed = true;
  }

  // 2. WordPress admin/legacy paths → 410 Gone
  for (const rx of WP_BLOCK) {
    if (rx.test(url.pathname)) {
      return new Response("Gone", {
        status: 410,
        headers: { "Cache-Control": "public, max-age=86400" },
      });
    }
  }

  // 3. Lowercase pathname (slugs are all-lowercase)
  if (/[A-Z]/.test(url.pathname)) {
    url.pathname = url.pathname.toLowerCase();
    changed = true;
  }

  // 4. Collapse double slashes in pathname
  if (/\/{2,}/.test(url.pathname)) {
    url.pathname = url.pathname.replace(/\/{2,}/g, "/");
    changed = true;
  }

  // 5. Feed redirects:
  //    /comments/feed/ → /feed/
  //    /{slug}/feed/   → /{slug}/
  if (url.pathname === "/comments/feed" || url.pathname === "/comments/feed/") {
    url.pathname = "/feed";
    changed = true;
  } else {
    const feedMatch = url.pathname.match(/^(\/.+?)\/feed\/?$/);
    if (feedMatch && feedMatch[1] !== "/feed") {
      url.pathname = feedMatch[1].endsWith("/") ? feedMatch[1] : feedMatch[1] + "/";
      changed = true;
    }
  }

  // 6. Strip tracking / legacy query params
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

  // 7. Trailing slash for content paths
  if (shouldEnforceTrailingSlash(url.pathname) && !url.pathname.endsWith("/")) {
    url.pathname = url.pathname + "/";
    changed = true;
  }

  if (changed) {
    return permanentRedirect(url.pathname + url.search + url.hash);
  }
  return null;
}
// --------------------------------------------------------------------------

// Routes that must always go through SSR (auth, admin, search, APIs, server fns)
function isDynamicPath(path: string): boolean {
  return (
    path.startsWith("/admin") ||
    path.startsWith("/search") ||
    path.startsWith("/api/") ||
    path.startsWith("/_serverFn") ||
    path.startsWith("/_server") ||
    path === "/setup-cowork"
  );
}

function isIndexingDisabled(env: Record<string, string | undefined>): boolean {
  const v = (env.INDEXING_ENABLED ?? env.EPR_INDEXING_ENABLED ?? "").trim().toLowerCase();
  if (v === "") return false; // default: indexing on (DB may still override SSR responses)
  return !(v === "true" || v === "1");
}

function withKillSwitch(res: Response, noindex: boolean): Response {
  if (!noindex) return res;
  // Don't mutate immutable assets responses needlessly; only HTML/XML/feeds matter for indexing.
  const ct = res.headers.get("content-type") ?? "";
  if (!/text\/html|xml|application\/rss/.test(ct)) return res;
  const headers = new Headers(res.headers);
  headers.set("X-Robots-Tag", NOINDEX_HEADER);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const noindex = isIndexingDisabled(env ?? {});

    // 0. Canonicalization (host, case, slashes, query params, feeds, WP block)
    const canonicalRes = canonicalize(request);
    if (canonicalRes) return canonicalRes;

    // 1. Custom redirects map (legacy WP slugs etc.)
    const key = path.replace(/\/$/, "") || "/";
    const r = REDIRECT_MAP.get(key);
    if (r) {
      return new Response(null, {
        status: (r.status === 302 ? 302 : 301) as 301 | 302,
        headers: {
          Location: r.target,
          "Cache-Control": "public, max-age=3600, s-maxage=86400",
        },
      });
    }

    // 2. Try static assets first for non-dynamic paths
    if (!isDynamicPath(path) && env?.ASSETS) {
      try {
        const assetRes = await env.ASSETS.fetch(request);
        if (assetRes.status !== 404) {
          return withKillSwitch(assetRes, noindex);
        }
      } catch (e) {
        console.error("[server] ASSETS.fetch failed:", e);
      }
    }

    // 2. Tier-2 fallback: dynamic SSR
    void env; void ctx;
    const ssrRes = await tanstackFetch(request);
    return withKillSwitch(ssrRes, noindex);
  },
};
