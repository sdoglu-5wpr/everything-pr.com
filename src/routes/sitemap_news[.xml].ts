import { createFileRoute } from "@tanstack/react-router";
import { resolveIndexingState } from "@/serverFns/indexing.server";
import { buildNewsSitemap, SITEMAP_HEADERS } from "@/serverFns/sitemaps.server";

export const Route = createFileRoute("/sitemap_news.xml")({
  server: {
    handlers: {
      GET: async () => {
        const state = await resolveIndexingState();
        if (!state.enabled) return new Response("Not Found", { status: 404 });
        const xml = await buildNewsSitemap();
        return new Response(xml, {
          headers: {
            ...SITEMAP_HEADERS,
            // News sitemap should refresh frequently.
            "Cache-Control": "public, max-age=300, s-maxage=300",
          },
        });
      },
    },
  },
});
