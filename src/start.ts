import { createMiddleware, createStart } from "@tanstack/react-start";
import { attachSupabaseAuth } from "./integrations/supabase/auth-attacher";
import redirectsData from "./generated/redirects.json";

const NOINDEX_HEADER = "noindex, nofollow, noarchive, nosnippet, noimageindex";
const UPLOADS_PREFIX = "/wp-content/uploads/";
const UPLOADS_ORIGIN = "https://sareld.wpengine.com";

// HTML cache: 60s browser, 1d edge, 7d SWR (same on staging + prod for parity)
const HTML_CACHE = "public, max-age=60, s-maxage=86400, stale-while-revalidate=604800";
const SITEMAP_CACHE = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

type Redirect = { source: string; target: string; status: number };
const REDIRECT_MAP = new Map<string, Redirect>(
  (redirectsData as Redirect[]).map((r) => [r.source.replace(/\/$/, "") || "/", r]),
);

const imageProxyMiddleware = createMiddleware({ type: "request" }).server(
  async ({ request, next }) => {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(UPLOADS_PREFIX)) return next();
    const upstream = `${UPLOADS_ORIGIN}${url.pathname}${url.search}`;
    const res = await fetch(upstream, {
      headers: {
        "User-Agent": "Everything-PR image proxy",
        Accept: request.headers.get("Accept") ?? "image/avif,image/webp,image/*,*/*;q=0.8",
      },
    });
    const headers = new Headers(res.headers);
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800");
    headers.delete("set-cookie");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  },
);

const redirectMiddleware = createMiddleware({ type: "request" }).server(
  async ({ request, next }) => {
    const url = new URL(request.url);
    const key = url.pathname.replace(/\/$/, "") || "/";
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
    return next();
  },
);

const responseHeadersMiddleware = createMiddleware().server(async ({ request, next }) => {
  const result = await next();
  const { resolveIndexingState } = await import("./serverFns/indexing.server");
  const state = await resolveIndexingState();

  const url = new URL(request.url);
  const headers = new Headers(result.response.headers);
  const ct = headers.get("content-type") ?? "";

  // X-Robots-Tag on every response when staging
  if (!state.enabled) headers.set("X-Robots-Tag", NOINDEX_HEADER);

  // Cache-Control by content type / route family. We OVERWRITE upstream
  // headers — loaders/routes emit `no-cache, must-revalidate` by default
  // which would block edge caching. /admin and /api routes opt out below.
  const path = url.pathname;
  const isAdmin = path.startsWith("/admin-everything") || path.startsWith("/api/");
  if (!isAdmin) {
    if (ct.includes("text/html")) {
      headers.set("Cache-Control", HTML_CACHE);
    } else if (path.endsWith(".xml") || path === "/feed") {
      headers.set("Cache-Control", SITEMAP_CACHE);
    }
  }

  result.response = new Response(result.response.body, {
    status: result.response.status,
    statusText: result.response.statusText,
    headers,
  });
  return result;
});

export const startInstance = createStart(() => ({
  requestMiddleware: [imageProxyMiddleware, redirectMiddleware, responseHeadersMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));
