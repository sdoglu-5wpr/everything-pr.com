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

const robotsHeaderMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();
  const { resolveIndexingState } = await import("./server/indexing.server");
  const state = await resolveIndexingState();

  if (!state.enabled) {
    const headers = new Headers(result.response.headers);
    headers.set("X-Robots-Tag", NOINDEX_HEADER);
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