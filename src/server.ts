import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import redirectsData from "./generated/redirects.json" with { type: "json" };

const tanstackFetch = createStartHandler(defaultStreamHandler);

type Redirect = { source: string; target: string; status: number };
const REDIRECT_MAP = new Map<string, Redirect>(
  (redirectsData as Redirect[]).map((r) => [r.source.replace(/\/$/, "") || "/", r]),
);

const NOINDEX_HEADER = "noindex, nofollow, noarchive, nosnippet, noimageindex";

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

    // 1. Redirects (pre-empt both static + SSR)
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
