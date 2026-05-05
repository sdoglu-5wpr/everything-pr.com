import { createFileRoute } from "@tanstack/react-router";
import { resolveIndexingState } from "@/serverFns/indexing.server";
import { buildRssFeed } from "@/serverFns/sitemaps.server";

// RSS feed at /feed (and /feed/ via trailing-slash route match)
export const Route = createFileRoute("/feed")({
  server: {
    handlers: {
      GET: async () => {
        const state = await resolveIndexingState();
        const xml = await buildRssFeed();
        const headers: Record<string, string> = {
          "Content-Type": "application/rss+xml; charset=utf-8",
          "Cache-Control": "public, max-age=600, s-maxage=600",
        };
        if (!state.enabled) headers["X-Robots-Tag"] = "noindex, nofollow";
        return new Response(xml, { headers });
      },
    },
  },
});
