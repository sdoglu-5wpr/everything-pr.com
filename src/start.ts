import { createMiddleware, createStart } from "@tanstack/react-start";

const NOINDEX_HEADER = "noindex, nofollow, noarchive, nosnippet, noimageindex";
const UPLOADS_PREFIX = "/wp-content/uploads/";
const UPLOADS_ORIGIN = "https://sareld.wpengine.com";

const imageProxyMiddleware = createMiddleware({ type: "request" }).server(async ({ request, next }) => {
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
});

const robotsHeaderMiddleware = createMiddleware().server(async ({ request, next }) => {
  const result = await next();
  const { resolveIndexingState } = await import("./server/indexing.server");
  const state = await resolveIndexingState();

  const url = new URL(request.url);
  const perfToken = process.env.EPR_PERF_TEST_TOKEN;
  const isPerfTest =
    !!perfToken && url.searchParams.get("_perf_test") === perfToken;

  if (!state.enabled || isPerfTest) {
    const headers = new Headers(result.response.headers);
    if (!state.enabled) headers.set("X-Robots-Tag", NOINDEX_HEADER);
    if (isPerfTest && !state.enabled) {
      headers.set(
        "Cache-Control",
        "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      );
    }
    result.response = new Response(result.response.body, {
      status: result.response.status,
      statusText: result.response.statusText,
      headers,
    });
  }

  return result;
});

export const startInstance = createStart(() => ({
  requestMiddleware: [imageProxyMiddleware, robotsHeaderMiddleware],
}));