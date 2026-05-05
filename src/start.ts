import { createMiddleware, createStart } from "@tanstack/react-start";

const NOINDEX_HEADER = "noindex, nofollow, noarchive, nosnippet, noimageindex";

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
  requestMiddleware: [robotsHeaderMiddleware],
}));